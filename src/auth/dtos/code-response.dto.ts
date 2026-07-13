import { ApiProperty } from '@nestjs/swagger';

export class CodeResponseDto {

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  readonly code!: string;

  @ApiProperty({ example: 'state-aleatorio-xyz' })
  readonly state!: string;
}