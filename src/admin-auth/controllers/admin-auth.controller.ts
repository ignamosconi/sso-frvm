import { Controller, Post, Body, Inject } from '@nestjs/common';
import { IAdminAuthController } from './admin-auth.controller.interface.js';
import type { IAdminAuthService } from '../services/admin-auth.service.interface.js';
import { AdminLoginRequestDto } from '../dtos/admin-login-request.dto.js';
import { AdminRefreshRequestDto } from '../dtos/admin-refresh-request.dto.js';
import { TokenResponseDto } from '../../auth/dtos/token-response.dto.js';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin — Autenticación')
@Controller('admin/auth')
export class AdminAuthController implements IAdminAuthController {
  constructor(
    @Inject('IAdminAuthService')
    private readonly adminAuthService: IAdminAuthService,
  ) {}


  @ApiOperation({ summary: 'Login de administrador' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @Post('login')
  login(@Body() dto: AdminLoginRequestDto): Promise<TokenResponseDto> {
    return this.adminAuthService.login(dto);
  }

  @ApiOperation({ summary: 'Renovar access token de administrador' })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  @Post('refresh')
  refresh(@Body() dto: AdminRefreshRequestDto): Promise<TokenResponseDto> {
    return this.adminAuthService.refresh(dto);
  }
}