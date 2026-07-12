import { ApiProperty } from '@nestjs/swagger';

export class OAuthClientResponseDto {

  @ApiProperty({ example: 1 })
  readonly id!: number;

  @ApiProperty({ example: 'Torneito' })
  readonly clientName!: string;

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
  readonly redirectUri!: string;

  @ApiProperty({ example: '57df647b26106facbd7bf95bb728dcb62a332123a080cd8b649596e92dfeb089' })
  readonly clientSecret!: string;

  @ApiProperty()
  readonly createdAt!: Date;

  @ApiProperty()
  readonly updatedAt!: Date;
}