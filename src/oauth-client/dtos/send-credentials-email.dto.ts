import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCredentialsEmailDto {
  @ApiProperty({ example: 'cliente@ejemplo.com' })
  @IsEmail()
  to!: string;

  @ApiProperty({ example: '57df647b26106facbd7bf95bb728dcb62a332123a080cd8b649596e92dfeb089' })
  @IsString()
  @Length(64, 64)
  plainSecret!: string;
}