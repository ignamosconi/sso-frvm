import { Response } from 'express';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';

export interface IAuthController {
  serveLoginPage(res: Response): void;
  login(loginDto: LoginRequestDto): Promise<UserInfoOauthDto>;
}