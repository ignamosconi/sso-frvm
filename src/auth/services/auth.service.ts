import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { IAuthService } from './auth.service.interface.js';
import type { ICodeService } from '../../code/services/code.service.interface.js';
import type { IOAuthClientService } from '../../oauth-client/services/oauth-client.service.interface.js';
import type { IRefreshTokenService } from '../../refresh-token/services/refresh-token.service.interface.js';
import { LoginRequestDto } from '../dtos/login-request.dto.js';
import { AuthorizationCodeRequestDto } from '../dtos/authorization-code-request.dto.js';
import { RefreshRequestDto } from '../dtos/refresh-request.dto.js';
import { LogoutRequestDto } from '../dtos/logout-request.dto.js';
import { CodeResponseDto } from '../dtos/code-response.dto.js';
import { TokenResponseDto } from '../dtos/token-response.dto.js';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto.js';
import { AutogestionLoginResponseDto } from '../dtos/autogestion-login-response.dto.js';
import { AutogestionUserResponseDto } from '../dtos/autogestion-user-response.dto.js';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto.js';
import { JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class AuthService implements IAuthService {
  private readonly baseUrl: string;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject('ICodeService')
    private readonly codeService: ICodeService,
    @Inject('IOAuthClientService')
    private readonly oauthClientService: IOAuthClientService,
    @Inject('IRefreshTokenService')
    private readonly refreshTokenService: IRefreshTokenService,
  ) {
    this.baseUrl = this.configService.getOrThrow<string>('AUTOGESTION_BASE_URL');
    this.accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessExpiresIn = this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN');
    this.refreshExpiresIn = this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');
  }

  async validateAndGetUserInfo(loginDto: LoginRequestDto): Promise<UserInfoOauthDto> {
    let loginData: AutogestionLoginResponseDto;
    try {
      const loginResponse = await firstValueFrom(
        this.httpService.post<AutogestionLoginResponseDto>(
          `${this.baseUrl}/login`,
          {},
          {
            headers: { nick: loginDto.legajo, password: loginDto.password },
            timeout: 8000,
          },
        ),
      );
      loginData = loginResponse.data;
    } catch {
      throw new UnauthorizedException('Credenciales inválidas en Autogestión.');
    }

    if (!loginData || !loginData.hashActual) {
      throw new UnauthorizedException('No se pudo obtener el hash de sesión.');
    }

    const credentialsString = `${loginDto.legajo}:${loginData.hashActual}`;
    const base64Credentials = Buffer.from(credentialsString).toString('base64');

    let userData: AutogestionUserResponseDto;
    try {
      const userResponse = await firstValueFrom(
        this.httpService.get<AutogestionUserResponseDto>(`${this.baseUrl}/usuarios`, {
          headers: { Authorization: `Basic ${base64Credentials}` },
          timeout: 8000,
        }),
      );
      userData = userResponse.data;
    } catch {
      throw new BadRequestException('Error al recuperar los datos del estudiante.');
    }

    const email =
      userData.persona?.email && userData.persona.email.trim().toLowerCase() !== 'none'
        ? userData.persona.email.trim()
        : '';

    return {
      sub: userData.id.toString(),
      nombre: userData.persona.nombre,
      apellido: userData.persona.apellido,
      legajo: userData.persona.alumno?.legajo || userData.nick,
      carrera: userData.persona.alumno?.especialidad?.nombre || 'No especificada',
      email,
      grupo: userData.grupo?.nombre || 'Alumno',
    };
  }

  async issueCode(loginDto: LoginRequestDto): Promise<CodeResponseDto> {
    const clientId = parseInt(loginDto.client_id, 10);

    const client = await this.oauthClientService.findOne(clientId).catch(() => null);
    if (!client) throw new UnauthorizedException('client_id inválido.');
    if (!client.isActive) throw new UnauthorizedException('La aplicación está suspendida.');
    if (!client.redirectUris.includes(loginDto.redirect_uri)) {
      throw new UnauthorizedException('redirect_uri no coincide con las registradas.');
    }

    const userInfo = await this.validateAndGetUserInfo(loginDto);
    const code = this.codeService.generate(userInfo, clientId);
    return { code, state: loginDto.state };
  }

  async exchangeCodeForTokens(dto: AuthorizationCodeRequestDto): Promise<TokenResponseDto> {
    const clientId = parseInt(dto.client_id, 10);

    const valid = await this.oauthClientService.validateClient(clientId, dto.client_secret, dto.redirect_uri);
    if (!valid) throw new UnauthorizedException('client_id, client_secret o redirect_uri inválidos.');

    const entry = this.codeService.consume(dto.code);
    if (!entry) throw new UnauthorizedException('El código es inválido o ya expiró.');
    if (entry.clientId !== clientId) throw new UnauthorizedException('El código no pertenece a este cliente.');

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { ...entry.userInfo, type: 'access' },
        { secret: this.accessSecret, expiresIn: this.accessExpiresIn } as JwtSignOptions,
      ),
      this.jwtService.signAsync(
        { ...entry.userInfo, type: 'refresh' },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn } as JwtSignOptions,
      ),
    ]);

    // Guardar refresh token en DB (inicio de nueva familia)
    await this.refreshTokenService.save({
      token: refresh_token,
      sub: entry.userInfo.sub,
      type: 'student',
      expiresIn: this.refreshExpiresIn,
    });

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(this.accessExpiresIn),
    };
  }

  async refreshTokens(refreshRequestDto: RefreshRequestDto): Promise<TokenResponseDto> {
    // Verificar firma JWT primero
    let storedPayload: JwtPayloadDto;
    try {
      storedPayload = await this.jwtService.verifyAsync<JwtPayloadDto>(
        refreshRequestDto.refresh_token,
        { secret: this.refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    if (storedPayload.type !== 'refresh') {
      throw new UnauthorizedException('El token proporcionado no es un refresh token.');
    }

    // Consumir en DB (detecta reutilización y revoca familia si es necesario)
    const record = await this.refreshTokenService.consume(refreshRequestDto.refresh_token);

    const userInfo: Omit<JwtPayloadDto, 'type' | 'iat' | 'exp'> = {
      sub: storedPayload.sub,
      nombre: storedPayload.nombre,
      apellido: storedPayload.apellido,
      legajo: storedPayload.legajo,
      carrera: storedPayload.carrera,
      email: storedPayload.email,
      grupo: storedPayload.grupo,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...userInfo, type: 'access' },
        { secret: this.accessSecret, expiresIn: this.accessExpiresIn } as JwtSignOptions,
      ),
      this.jwtService.signAsync(
        { ...userInfo, type: 'refresh' },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn } as JwtSignOptions,
      ),
    ]);

    // Guardar nuevo refresh token en la misma familia
    await this.refreshTokenService.save({
      token: newRefreshToken,
      sub: record.sub,
      type: 'student',
      expiresIn: this.refreshExpiresIn,
      familyId: record.familyId,
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(this.accessExpiresIn),
    };
  }

  async logout(dto: LogoutRequestDto): Promise<void> {
    await this.refreshTokenService.revokeFamily(dto.refresh_token);
  }

  private parseExpiresIn(value: string): number {
    const unit = value.slice(-1);
    const amount = parseInt(value.slice(0, -1), 10);
    switch (unit) {
      case 's': return amount;
      case 'm': return amount * 60;
      case 'h': return amount * 60 * 60;
      case 'd': return amount * 60 * 60 * 24;
      default:  return parseInt(value, 10);
    }
  }

  getCleanUserInfo(payload: JwtPayloadDto): UserInfoOauthDto {
    return {
      sub: payload.sub,
      nombre: payload.nombre,
      apellido: payload.apellido,
      legajo: payload.legajo,
      carrera: payload.carrera,
      email: payload.email,
      grupo: payload.grupo,
    };
  }
}