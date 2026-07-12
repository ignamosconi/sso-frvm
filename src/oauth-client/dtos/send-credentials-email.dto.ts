import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCredentialsEmailDto {
  @ApiProperty({ example: 'desarrollador@frvm.utn.edu.ar' })
  @IsEmail()
  to!: string;
}