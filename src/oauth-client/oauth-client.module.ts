import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OAuthClientEntity } from './entities/oauth-client.entity.js';
import { OAuthClientService } from './services/oauth-client.service.js';
import { OAuthClientController } from './controllers/oauth-client.controller.js';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard.js';
import { CredentialTokenModule } from '../credential-token/credential-token.module.js';
import { RefreshTokenModule } from '../refresh-token/refresh-token.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([OAuthClientEntity]),
    ConfigModule,
    JwtModule.register({}),
    CredentialTokenModule,
    RefreshTokenModule,
  ],
  controllers: [OAuthClientController],
  providers: [
    {
      provide: 'IOAuthClientService',
      useClass: OAuthClientService,
    },
    AdminJwtGuard,
  ],
  exports: ['IOAuthClientService'],
})
export class OAuthClientModule {}