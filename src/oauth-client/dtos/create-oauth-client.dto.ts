import { IsString, IsUrl, MinLength } from 'class-validator';

export class CreateOAuthClientDto {
  @IsString()
  @MinLength(2)
  clientName!: string;

  @IsUrl({ require_tld: false })
  redirectUri!: string;
}