import { ApiProperty } from '@nestjs/swagger';

export class ConsumeCredentialTokenResultDto {
  @ApiProperty({ example: 1 })
  readonly oauthClientId!: number;

  @ApiProperty({ example: '57df647b...' })
  readonly plainSecret!: string;

  @ApiProperty({ example: 'Torneito' })
  readonly clientName!: string;

  @ApiProperty({ example: ['https://miapp.com/callback'] })
  readonly redirectUris!: string[];
}