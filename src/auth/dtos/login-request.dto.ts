import { IsString, IsNumberString, IsUrl } from 'class-validator';

export class LoginRequestDto {
  @IsNumberString()
  client_id!: string;

  @IsUrl({ require_tld: false })
  redirect_uri!: string;

  @IsString()
  state!: string;

  @IsString()
  legajo!: string;

  @IsString()
  password!: string;
}