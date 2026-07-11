import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    //Archivo .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Configura la carpeta public como estática bajo el prefijo '/app'
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'), 
      serveRoot: '/app', 
    }),
    
    AuthModule,
  ],
})
export class AppModule {}