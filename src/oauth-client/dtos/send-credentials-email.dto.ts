import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCredentialsEmailDto {
  @ApiProperty({ example: 'cliente@ejemplo.com' })
  @IsEmail()
  to!: string;
  
  // plainSecret ya no viaja desde el frontend — el backend lo recupera de Redis.
}