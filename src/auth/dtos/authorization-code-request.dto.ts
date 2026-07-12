import { IsString, IsNumberString, IsUrl } from 'class-validator';

export class AuthorizationCodeRequestDto {
  @IsNumberString()
  client_id!: string;

  @IsString()
  client_secret!: string;

  @IsString()
  code!: string;

  @IsUrl({ require_tld: false })
  redirect_uri!: string;
}