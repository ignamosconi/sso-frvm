import { LoginRequestDto } from '../dtos/login-request.dto';
import { RefreshRequestDto } from '../dtos/refresh-request.dto';
import { TokenResponseDto } from '../dtos/token-response.dto';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';

export interface IAuthService {
  validateAndGetUserInfo(loginDto: LoginRequestDto): Promise<UserInfoOauthDto>;
  issueTokens(userInfo: UserInfoOauthDto): Promise<TokenResponseDto>;
  refreshTokens(refreshRequestDto: RefreshRequestDto): Promise<TokenResponseDto>;
}