import { IsString } from 'class-validator';

export class RefreshRequestDto {
  @IsString()
  readonly refresh_token!: string;
}