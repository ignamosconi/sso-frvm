import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { IAuthService } from './auth.service.interface.js';
import type { ICodeService } from '../../code/services/code.service.interface.js';
import type { IOAuthClientService } from '../../oauth-client/services/oauth-client.service.interface.js';
import { LoginRequestDto } from '../dtos/login-request.dto.js';
import { AuthorizationCodeRequestDto } from '../dtos/authorization-code-request.dto.js';
import { RefreshRequestDto } from '../dtos/refresh-request.dto.js';
import { CodeResponseDto } from '../dtos/code-response.dto.js';
import { TokenResponseDto } from '../dtos/token-response.dto.js';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto.js';
import { AutogestionLoginResponseDto } from '../dtos/autogestion-login-response.dto.js';
import { AutogestionUserResponseDto } from '../dtos/autogestion-user-response.dto.js';

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
          { headers: { nick: loginDto.legajo, password: loginDto.password } },
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

    //Valida que el client_id exista y el redirect_uri sea el registrado
    //No validamos client_secret acá (eso es solo server-to-server en /token)
    const client = await this.oauthClientService.findOne(clientId).catch(() => null);
    if (!client) throw new UnauthorizedException('client_id inválido.');
    if (client.redirectUri !== loginDto.redirect_uri) {
      throw new UnauthorizedException('redirect_uri no coincide con la registrada.');
    }

    const userInfo = await this.validateAndGetUserInfo(loginDto);
    const code = this.codeService.generate(userInfo.sub, clientId);

    return { code, state: loginDto.state };
  }

  async exchangeCodeForTokens(dto: AuthorizationCodeRequestDto): Promise<TokenResponseDto> {
    const clientId = parseInt(dto.client_id, 10);

    const valid = await this.oauthClientService.validateClient(clientId, dto.client_secret, dto.redirect_uri);
    if (!valid) throw new UnauthorizedException('client_id, client_secret o redirect_uri inválidos.');

    const entry = this.codeService.consume(dto.code);
    if (!entry) throw new UnauthorizedException('El código es inválido o ya expiró.');
    if (entry.clientId !== clientId) throw new UnauthorizedException('El código no pertenece a este cliente.');

    const payload: Partial<UserInfoOauthDto> = { sub: entry.sub };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as any,
      }),
      this.jwtService.signAsync(
        { sub: entry.sub },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn as any },
      ),
    ]);

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(this.accessExpiresIn),
    };
  }

  async refreshTokens(refreshRequestDto: RefreshRequestDto): Promise<TokenResponseDto> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshRequestDto.refresh_token,
        { secret: this.refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    const newAccessToken = await this.jwtService.signAsync(
      { sub: payload.sub },
      { secret: this.accessSecret, expiresIn: this.accessExpiresIn as any },
    );

    return {
      access_token: newAccessToken,
      refresh_token: refreshRequestDto.refresh_token,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(this.accessExpiresIn),
    };
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
}