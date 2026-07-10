import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config'; // Importación añadida
import { firstValueFrom } from 'rxjs';
import { IAuthService } from './auth.service.interface';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';
import { AutogestionLoginResponseDto } from '../dtos/autogestion-login-response.dto';
import { AutogestionUserResponseDto } from '../dtos/autogestion-user-response.dto';

@Injectable()
export class AuthService implements IAuthService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService // Inyección añadida
  ) {
    this.baseUrl = this.configService.getOrThrow<string>('AUTOGESTION_BASE_URL');
  }

  async validateAndGetUserInfo(loginDto: LoginRequestDto): Promise<UserInfoOauthDto> {
    let loginData: AutogestionLoginResponseDto;
    try {
      const loginResponse = await firstValueFrom(
        this.httpService.post<AutogestionLoginResponseDto>(
          `${this.baseUrl}/login`,
          {},
          {
            headers: {
              nick: loginDto.legajo,
              password: loginDto.password,
            },
          },
        ),
      );
      loginData = loginResponse.data;
    } catch (error) {
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
    } catch (error) {
      throw new BadRequestException('Error al recuperar los datos del estudiante.');
    }

    const email = userData.persona?.email;
    if (!email || email.trim().toLowerCase() === 'none') {
      throw new BadRequestException(
        'Debe ingresar a autogestión, ir al menú lateral, datos de usuario, y cargar su mail y teléfono.',
      );
    }

    return {
      sub: userData.id.toString(),
      nombre: userData.persona.nombre,
      apellido: userData.persona.apellido,
      legajo: userData.persona.alumno?.legajo || userData.nick,
      carrera: userData.persona.alumno?.especialidad?.nombre || 'No especificada',
      email: email,
      grupo: userData.grupo?.nombre || 'Alumno',
    };
  }
}