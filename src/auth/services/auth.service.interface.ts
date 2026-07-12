import { LoginRequestDto } from '../dtos/login-request.dto.js';
import { AuthorizationCodeRequestDto } from '../dtos/authorization-code-request.dto.js';
import { RefreshRequestDto } from '../dtos/refresh-request.dto.js';
import { CodeResponseDto } from '../dtos/code-response.dto.js';
import { TokenResponseDto } from '../dtos/token-response.dto.js';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto.js';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto.js';

export interface IAuthService {
  validateAndGetUserInfo(loginDto: LoginRequestDto): Promise<UserInfoOauthDto>;
  issueCode(loginDto: LoginRequestDto): Promise<CodeResponseDto>;
  exchangeCodeForTokens(dto: AuthorizationCodeRequestDto): Promise<TokenResponseDto>;
  refreshTokens(refreshRequestDto: RefreshRequestDto): Promise<TokenResponseDto>;
  getCleanUserInfo(payload: JwtPayloadDto): UserInfoOauthDto;
}