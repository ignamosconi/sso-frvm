import { IsString, IsNumberString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthorizationCodeRequestDto {

  @ApiProperty({ example: '1' })
  @IsNumberString()
  client_id!: string;

  @ApiProperty({ example: '57df647b26106facbd7bf95bb728dcb62a332123a080cd8b649596e92dfeb089' })
  @IsString()
  client_secret!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  code!: string;

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
  redirect_uri!: string;
}