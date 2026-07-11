import { Controller, Post, Get, Body, Res, Inject, UseGuards } from '@nestjs/common';
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

@Controller(process.env.AUTH_ROUTE_PATH || 'oauth')
export class AuthController implements IAuthController {
  constructor(
    @Inject('IAuthService')
    private readonly authService: IAuthService,
  ) {}

  @Get('login')
  serveLoginPage(@Res() res: Response): void {
    res.sendFile(join(__dirname, '..', '..', 'public', 'login.html'));
  }

  @Post('login')
  async login(@Body() loginDto: LoginRequestDto): Promise<CodeResponseDto> {
    return this.authService.issueCode(loginDto);
  }

  @Post('token')
  async token(@Body() dto: AuthorizationCodeRequestDto): Promise<TokenResponseDto> {
    return this.authService.exchangeCodeForTokens(dto);
  }

  @Post('refresh')
  async refresh(@Body() refreshRequestDto: RefreshRequestDto): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(refreshRequestDto);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user: UserInfoOauthDto): UserInfoOauthDto {
    return user;
  }
}