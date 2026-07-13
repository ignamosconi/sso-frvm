import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin2', minLength: 3 })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'password_segura', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}