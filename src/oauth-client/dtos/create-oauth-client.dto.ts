import { IsString, IsUrl, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOAuthClientDto {
  @ApiProperty({ example: 'Torneito', minLength: 2 })
  @IsString()
  @MinLength(2)
  clientName!: string;

    @ApiProperty({
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
  @IsUrl({ require_tld: false })
  redirectUri!: string;
}