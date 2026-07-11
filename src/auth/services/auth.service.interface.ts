import { LoginRequestDto } from '../dtos/login-request.dto';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';

export interface IAuthService {
  validateAndGetUserInfo(loginDto: LoginRequestDto): Promise<UserInfoOauthDto>;
}