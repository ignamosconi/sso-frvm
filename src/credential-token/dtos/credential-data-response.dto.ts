import { ApiProperty } from '@nestjs/swagger';

export class CredentialDataResponseDto {
  @ApiProperty({ example: 1 })
  readonly id!: number;

  @ApiProperty({ example: 'Torneito' })
  readonly clientName!: string;

  @ApiProperty({ example: ['https://miapp.com/callback'] })
  readonly redirectUris!: string[];

  @ApiProperty({ example: '57df647b26106facbd7bf95bb728dcb62a332123a080cd8b649596e92dfeb089' })
  readonly plainSecret!: string;
}