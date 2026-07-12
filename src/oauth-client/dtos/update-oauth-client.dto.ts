import { IsString, IsUrl, MinLength, IsOptional } from 'class-validator';

export class UpdateOAuthClientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  clientName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;
}