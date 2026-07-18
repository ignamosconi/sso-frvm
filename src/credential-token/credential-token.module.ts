import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CredentialTokenEntity } from './entities/credential-token.entity.js';
import { CredentialTokenService } from './services/credential-token.service.js';
import { CredentialTokenController } from './controllers/credential-token.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([CredentialTokenEntity]),
    ConfigModule,
  ],
  controllers: [CredentialTokenController],
  providers: [
    {
      provide: 'ICredentialTokenService',
      useClass: CredentialTokenService,
    },
  ],
  exports: ['ICredentialTokenService'],
})
export class CredentialTokenModule {}