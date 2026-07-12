import { IsString, IsUrl, MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOAuthClientDto {
  @ApiPropertyOptional({ example: 'Torneito v2', minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  clientName?: string;

  @ApiPropertyOptional({
    examples: {
      localhost: {
        summary: 'Desarrollo local',
        value: 'http://localhost:4000/callback',
      },
      production: {
        summary: 'Aplicación en producción',
        value: 'https://app.example.com/oauth/callback',
      },
    },
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;
}