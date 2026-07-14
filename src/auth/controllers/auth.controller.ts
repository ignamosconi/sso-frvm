import { Controller, Post, Get, Body, Res, Inject, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { join } from 'path';
import { IAuthController } from './auth.controller.interface.js';
import type { IAuthService } from '../services/auth.service.interface.js';
import { LoginRequestDto } from '../dtos/login-request.dto.js';
import { AuthorizationCodeRequestDto } from '../dtos/authorization-code-request.dto.js';
import { RefreshRequestDto } from '../dtos/refresh-request.dto.js';
import { CodeResponseDto } from '../dtos/code-response.dto.js';
import { TokenResponseDto } from '../dtos/token-response.dto.js';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto.js';
import { JwtGuard } from '../guards/jwt.guard.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto.js';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';


@ApiTags('SSO — Alumnos')
@Controller(process.env.AUTH_ROUTE_PATH || 'oauth')
export class AuthController implements IAuthController {
  constructor(
    @Inject('IAuthService')
    private readonly authService: IAuthService,
  ) {}

  @ApiExcludeEndpoint()
  @Get('login')
  serveLoginPage(@Res() res: Response): void {
    res.sendFile(join(__dirname, '..', '..', 'public', 'login', 'index.html'));
  }

  @ApiOperation({
    summary: 'Login de alumno',
    description: 'Valida las credenciales del alumno contra autogestión y emite un authorization code de un solo uso (TTL definido por CODE_TTL_MS). Este endpoint es llamado por el HTML del popup.',
  })
  @ApiResponse({ status: 201, type: CodeResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o client_id/redirect_uri incorrectos' })
  @ApiResponse({ status: 400, description: 'Body malformado' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })  // 5 intentos por minuto por IP
  @Post('login')
  async login(@Body() loginDto: LoginRequestDto): Promise<CodeResponseDto> {
    return this.authService.issueCode(loginDto);
  }

  @ApiOperation({
    summary: 'Canjear authorization code por tokens',
    description: 'Endpoint server-to-server. Recibe el code emitido por /login junto con client_id, client_secret y redirect_uri. Devuelve access_token y refresh_token. El code es de un solo uso y se invalida inmediatamente.',
  })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Code inválido, expirado, o credenciales de cliente incorrectas' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })  // 10 canjes por minuto por IP
  @Post('token')
  async token(@Body() dto: AuthorizationCodeRequestDto): Promise<TokenResponseDto> {
    return this.authService.exchangeCodeForTokens(dto);
  }

  @ApiOperation({
    summary: 'Renovar access token',
    description: 'Recibe un refresh token válido y devuelve un nuevo access token. El refresh token no cambia.',
  })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  @Post('refresh')
  async refresh(@Body() refreshRequestDto: RefreshRequestDto): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(refreshRequestDto);
  }

  @ApiOperation({
    summary: 'Obtener datos del alumno autenticado',
    description: 'Devuelve los datos del alumno a partir del access token. Requiere Bearer token de alumno.',
  })
  @ApiResponse({ status: 200, type: UserInfoOauthDto })
  @ApiResponse({ status: 401, description: 'Token inválido, expirado o ausente' })
  @ApiBearerAuth('alumno-jwt')
  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayloadDto): UserInfoOauthDto {
    return this.authService.getCleanUserInfo(user);
  }
}