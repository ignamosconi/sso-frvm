import { ApiProperty } from '@nestjs/swagger';

export class UserInfoOauthDto {

  @ApiProperty({ example: '131601' })
  readonly sub!: string;

  @ApiProperty({ example: 'Ignacio Mariano' })
  readonly nombre!: string;

  @ApiProperty({ example: 'Mosconi' })
  readonly apellido!: string;

  @ApiProperty({ example: '15288' })
  readonly legajo!: string;

  @ApiProperty({ example: 'Ingeniería en Sistemas de Información' })
  readonly carrera!: string;

  @ApiProperty({ example: 'alumno@gmail.com' })
  readonly email!: string;

  @ApiProperty({ example: 'Alumno' })
  readonly grupo!: string;
}