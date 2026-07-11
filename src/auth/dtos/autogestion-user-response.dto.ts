export class AutogestionUserResponseDto {
  readonly id!: number;
  readonly nick!: string;
  readonly grupo!: {
    id: number;
    nombre: string;
    permisos: any[];
    urlCliente: string;
  };
  readonly persona!: {
    id: number;
    nombre: string;
    apellido: string;
    documento: number;
    telefono: string | null;
    email: string | null;
    alumno: {
      facultad: string;
      legajo: string;
      especialidad: {
        id: number;
        nombre: string;
        codigoAcademico: string;
        importeInscripcion: number;
      };
    } | null;
    docente: any;
    director: any;
    telefonoInternacional: string | null;
  };
  readonly hashActual!: string;
  readonly forzarCambioPassword!: boolean;
  readonly username!: string;
}