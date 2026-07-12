import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import basicAuth = require('express-basic-auth');
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { AdminSeeder } from './database/seeders/admin.seeder.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  
  app.enableCors({
    origin: process.env.ADMIN_PANEL_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const swaggerUser = configService.getOrThrow<string>('SWAGGER_USER');
  const swaggerPassword = configService.getOrThrow<string>('SWAGGER_PASSWORD');

  // Basic Auth para proteger la ruta de Swagger
  // Tiene que registrarse ANTES de que SwaggerModule monte la UI
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
      persistAuthorization: true, // Mantiene el token al recargar la página
    },
  });

  const seeder = app.get(AdminSeeder);
  await seeder.seed();

  await app.listen(port);
}
bootstrap();