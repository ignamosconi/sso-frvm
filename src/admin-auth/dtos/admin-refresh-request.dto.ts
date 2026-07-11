import { IsString } from 'class-validator';

export class AdminRefreshRequestDto {
  @IsString()
  refresh_token!: string;
}