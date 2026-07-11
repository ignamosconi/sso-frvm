import { Controller, Post, Body, Inject } from '@nestjs/common';
import { IAdminAuthController } from './admin-auth.controller.interface.js';
import type { IAdminAuthService } from '../services/admin-auth.service.interface.js';
import { AdminLoginRequestDto } from '../dtos/admin-login-request.dto.js';
import { AdminRefreshRequestDto } from '../dtos/admin-refresh-request.dto.js';
import { TokenResponseDto } from '../../auth/dtos/token-response.dto.js';

@Controller('admin/auth')
export class AdminAuthController implements IAdminAuthController {
  constructor(
    @Inject('IAdminAuthService')
    private readonly adminAuthService: IAdminAuthService,
  ) {}

  @Post('login')
  login(@Body() dto: AdminLoginRequestDto): Promise<TokenResponseDto> {
    return this.adminAuthService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: AdminRefreshRequestDto): Promise<TokenResponseDto> {
    return this.adminAuthService.refresh(dto);
  }
}