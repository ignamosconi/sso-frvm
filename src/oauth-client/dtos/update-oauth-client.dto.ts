import { IsString, IsUrl, MinLength, IsArray, ArrayMaxSize, ArrayMinSize, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOAuthClientDto {
  @ApiPropertyOptional({ example: 'Torneito v2', minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  clientName?: string;

  @ApiPropertyOptional({
    example: ['http://localhost:4000/callback', 'https://miapp.com/callback'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https']
  redirectUris?: string[];
}