import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Module({
  imports: [HttpModule],
  controllers: [AuthController],
  providers: [
    {
      provide: 'IAuthService',
      useClass: AuthService,
    },
  ],
})
export class AuthModule {}