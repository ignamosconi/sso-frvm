import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { JwtGuard } from './guards/jwt.guard.js';
import { AdminJwtGuard } from './guards/admin-jwt.guard.js';
import { CodeModule } from '../code/code.module.js';
import { OAuthClientModule } from '../oauth-client/oauth-client.module.js';
import { RefreshTokenModule } from '../refresh-token/refresh-token.module.js';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    JwtModule.register({}),
    CodeModule,
    OAuthClientModule,
    RefreshTokenModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: 'IAuthService',
      useClass: AuthService,
    },
    JwtGuard,
    AdminJwtGuard,
  ],
})
export class AuthModule {}