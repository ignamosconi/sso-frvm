//No se documenta porque es interno de autogestión
export class AutogestionLoginResponseDto {
  readonly id!: number;
  readonly nick!: string;
  readonly grupo!: unknown;
  readonly persona!: unknown;
  readonly hashActual!: string;
  readonly forzarCambioPassword!: boolean;
}