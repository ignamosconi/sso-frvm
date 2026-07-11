import { Response } from 'express';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { RefreshRequestDto } from '../dtos/refresh-request.dto';
import { TokenResponseDto } from '../dtos/token-response.dto';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';

export interface IAuthController {
  serveLoginPage(res: Response): void;
  login(loginDto: LoginRequestDto): Promise<TokenResponseDto>;
  refresh(refreshRequestDto: RefreshRequestDto): Promise<TokenResponseDto>;
  me(user: UserInfoOauthDto): UserInfoOauthDto;
}