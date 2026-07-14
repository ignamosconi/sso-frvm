import { ApiProperty } from '@nestjs/swagger';

export class Admin2faSetupResponseDto {
  @ApiProperty({ description: 'URL de datos del QR para escanear con el autenticador' })
  readonly qrCodeDataUrl!: string;

  @ApiProperty({ description: 'Secret en texto plano, para ingreso manual en el autenticador' })
  readonly manualEntrySecret!: string;
}