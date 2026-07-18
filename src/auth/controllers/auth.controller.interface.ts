// DESPUÉS
import { Response } from 'express';
import { LoginRequestDto } from '../dtos/login-request.dto.js';
import { AuthorizationCodeRequestDto } from '../dtos/authorization-code-request.dto.js';
import { RefreshRequestDto } from '../dtos/refresh-request.dto.js';
import { LogoutRequestDto } from '../dtos/logout-request.dto.js';
import { CodeResponseDto } from '../dtos/code-response.dto.js';
import { TokenResponseDto } from '../dtos/token-response.dto.js';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto.js';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto.js';

export interface IAuthController {
  serveLoginPage(res: Response): void;
  login(loginDto: LoginRequestDto): Promise<CodeResponseDto>;
  token(dto: AuthorizationCodeRequestDto): Promise<TokenResponseDto>;
  refresh(refreshRequestDto: RefreshRequestDto): Promise<TokenResponseDto>;
  logout(dto: LogoutRequestDto): Promise<void>;
  me(user: JwtPayloadDto): UserInfoOauthDto;
}