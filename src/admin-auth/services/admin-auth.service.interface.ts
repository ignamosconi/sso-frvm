import { AdminLoginRequestDto } from '../dtos/admin-login-request.dto.js';
import { AdminRefreshRequestDto } from '../dtos/admin-refresh-request.dto.js';
import { AdminLogoutRequestDto } from '../dtos/admin-logout-request.dto.js';
import { TokenResponseDto } from '../../auth/dtos/token-response.dto.js';

export interface IAdminAuthService {
  login(dto: AdminLoginRequestDto): Promise<TokenResponseDto>;
  refresh(dto: AdminRefreshRequestDto): Promise<TokenResponseDto>;
  logout(dto: AdminLogoutRequestDto): Promise<void>;
}