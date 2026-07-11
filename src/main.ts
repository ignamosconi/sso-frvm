import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { AdminSeeder } from './database/seeders/admin.seeder.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Validación global de DTOs. Rechaza requests malformados antes de llegar a los servicios.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Seeder de admin
  const seeder = app.get(AdminSeeder);
  await seeder.seed();

  await app.listen(port);
}
bootstrap();