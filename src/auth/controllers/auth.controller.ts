import { Controller, Post, Get, Body, Res, Inject, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { IAuthController } from './auth.controller.interface';
import type { IAuthService } from '../services/auth.service.interface';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { RefreshRequestDto } from '../dtos/refresh-request.dto';
import { TokenResponseDto } from '../dtos/token-response.dto';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';
import { JwtGuard } from '../guards/jwt.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

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
  async login(@Body() loginDto: LoginRequestDto): Promise<TokenResponseDto> {
    const userInfo = await this.authService.validateAndGetUserInfo(loginDto);
    return this.authService.issueTokens(userInfo);
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