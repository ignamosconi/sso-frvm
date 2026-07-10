import { Controller, Post, Get, Body, Res, Inject } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { IAuthController } from './auth.controller.interface';
import type { IAuthService } from '../services/auth.service.interface';
import { LoginRequestDto } from '../dtos/login-request.dto';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';

@Controller('oauth')
export class AuthController implements IAuthController {
  constructor(
    @Inject('IAuthService')
    private readonly authService: IAuthService,
  ) {}

  // 1. Muestra la pantalla de Login
  @Get('login')
  serveLoginPage(@Res() res: Response): void {
    return res.sendFile(join(__dirname, '..', '..', 'public', 'login.html'));
  }

  // 2. Procesa el formulario enviado por el HTML
  @Post('login')
  async login(@Body() loginDto: LoginRequestDto): Promise<UserInfoOauthDto> {
    return await this.authService.validateAndGetUserInfo(loginDto);
  }
}