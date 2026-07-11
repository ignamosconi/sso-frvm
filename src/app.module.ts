import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AdminAuthModule } from './admin-auth/admin-auth.module.js';
import { OAuthClientModule } from './oauth-client/oauth-client.module.js';
import { CodeModule } from './code/code.module.js';
import { AdminEntity } from './admin/entities/admin.entity.js';
import { OAuthClientEntity } from './oauth-client/entities/oauth-client.entity.js';
import { AdminSeeder } from './database/seeders/admin.seeder.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      serveRoot: '/app',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: configService.getOrThrow<number>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        entities: [AdminEntity, OAuthClientEntity],
        synchronize: true, // Solo para desarrollo
      }),
    }),

    TypeOrmModule.forFeature([AdminEntity]),
    AuthModule,
    AdminModule,
    AdminAuthModule,
    OAuthClientModule,
    CodeModule,
  ],
  providers: [AdminSeeder],
})
export class AppModule {}