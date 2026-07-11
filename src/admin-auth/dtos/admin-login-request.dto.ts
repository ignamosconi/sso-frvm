import { IsString, MinLength } from 'class-validator';

export class AdminLoginRequestDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}