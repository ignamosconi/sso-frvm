import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminDto {

  @ApiPropertyOptional({ example: 'admin2_editado', minLength: 3 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiPropertyOptional({ example: 'nueva_password', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}