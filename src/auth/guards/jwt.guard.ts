import { Request as ExpressRequest } from 'express';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExpressRequest>();
    const authHeader = request.headers['authorization'] as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync<UserInfoOauthDto>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      (request as ExpressRequest & { user: UserInfoOauthDto }).user = payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    return true;
  }
}