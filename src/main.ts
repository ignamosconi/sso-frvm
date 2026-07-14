import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import basicAuth = require('express-basic-auth');
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { AdminSeeder } from './database/seeders/admin.seeder.js';

// DESPUÉS
const KNOWN_WEAK_SECRETS = new Set([
  'cambia_este_secret_acceso',
  'cambia_este_secret_refresco',
  'cambia_este_secret_admin_acceso',
  'cambia_este_secret_admin_refresco',
  'cambia_esta_password_min_8_caracteres',
  'cambia_esta_password_swagger',
  'admin',   // SWAGGER_USER por defecto
]);

function assertSecrets(configService: ConfigService): void {
  const env = configService.get<string>('NODE_ENV') ?? 'development';
  if (env !== 'production') return;

  const secretsToCheck: string[] = [
    configService.get<string>('JWT_ACCESS_SECRET') ?? '',
    configService.get<string>('JWT_REFRESH_SECRET') ?? '',
    configService.get<string>('JWT_ADMIN_ACCESS_SECRET') ?? '',
    configService.get<string>('JWT_ADMIN_REFRESH_SECRET') ?? '',
    configService.get<string>('ADMIN_PASSWORD_SEEDER') ?? '',
    configService.get<string>('SWAGGER_PASSWORD') ?? '',
    configService.get<string>('SWAGGER_USER') ?? '',
  ];

  for (const secret of secretsToCheck) {
    if (KNOWN_WEAK_SECRETS.has(secret)) {
      throw new Error(
        '[Seguridad] Se detectó un secreto por defecto del .env.example en entorno production. ' +
        'Rotá todos los secretos JWT, passwords de seeder y credenciales de Swagger antes de desplegar.',
      );
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ADMIN_PANEL_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const configService = app.get(ConfigService);

  // Falla al arrancar si hay secretos por defecto en producción
  assertSecrets(configService);

  const port = configService.get<number>('PORT') || 3000;
  const swaggerUser = configService.getOrThrow<string>('SWAGGER_USER');
  const swaggerPassword = configService.getOrThrow<string>('SWAGGER_PASSWORD');

  app.use(
    ['/docs', '/docs-json'],
    basicAuth({
      challenge: true,
      users: { [swaggerUser]: swaggerPassword },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('SSO FRVM')
    .setDescription('Servidor OAuth 2.0 para autenticación de alumnos de UTN FRVM.')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'alumno-jwt',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'admin-jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const seeder = app.get(AdminSeeder);
  await seeder.seed();

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok' });
  });

  await app.listen(port);
}
bootstrap();