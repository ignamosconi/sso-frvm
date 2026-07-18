import { Request as ExpressRequest } from 'express';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserInfoOauthDto } from '../dtos/user-info-oauth.dto';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto.js';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExpressRequest & { user?: UserInfoOauthDto }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayloadDto>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('El token proporcionado no es un access token.');
      }

      const typedRequest = request as ExpressRequest & { user: UserInfoOauthDto };
      typedRequest.user = payload;
      
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    return true;
  }
}