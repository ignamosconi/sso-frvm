import { ApiProperty } from '@nestjs/swagger';

export class OAuthClientCreatedResponseDto {
  @ApiProperty({ example: 1 })
  readonly id!: number;

  @ApiProperty({ example: 'Torneito' })
  readonly clientName!: string;

  @ApiProperty({ example: ['http://localhost:4000/callback', 'https://miapp.com/callback'] })
  readonly redirectUris!: string[];

  @ApiProperty({
    example: '57df647b26106facbd7bf95bb728dcb62a332123a080cd8b649596e92dfeb089',
    description: 'Secret en texto plano. Solo visible en este momento (no se puede recuperar después).',
  })
  readonly plainSecret!: string;

  @ApiProperty()
  readonly createdAt!: Date;

  @ApiProperty()
  readonly updatedAt!: Date;
}