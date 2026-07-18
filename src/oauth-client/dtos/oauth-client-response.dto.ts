import { ApiProperty } from '@nestjs/swagger';

export class OAuthClientResponseDto {
  @ApiProperty({ example: 1 })
  readonly id!: number;

  @ApiProperty({ example: 'Torneito' })
  readonly clientName!: string;

  @ApiProperty({ example: ['http://localhost:4000/callback', 'https://miapp.com/callback'] })
  readonly redirectUris!: string[];

  @ApiProperty({ example: true, description: 'false = cliente suspendido, no puede autenticar usuarios' })
  readonly isActive!: boolean;

  @ApiProperty()
  readonly createdAt!: Date;

  @ApiProperty()
  readonly updatedAt!: Date;
}