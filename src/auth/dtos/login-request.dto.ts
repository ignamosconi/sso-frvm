import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumberString, IsUrl } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: '1', description: 'ID del cliente OAuth registrado' })
  @IsNumberString()
  client_id!: string;

  @ApiProperty({ example: 'http://localhost:4000/callback', description: 'URI de redirección registrada para el cliente' })
  @IsUrl({ require_tld: false })
  redirect_uri!: string;

  @ApiProperty({ example: 'state-aleatorio-xyz', description: 'Valor generado por la app cliente para prevenir CSRF' })
  @IsString()
  state!: string;

  @ApiProperty({ example: '15288' })
  @IsString()
  legajo!: string;

  @ApiProperty({ example: 'mi_contraseña_segura123!' })
  @IsString()
  password!: string;
}