import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CodeService } from './code.service.js';
import { UserInfoOauthDto } from '../../auth/dtos/user-info-oauth.dto.js';

const mockUserInfo: UserInfoOauthDto = {
  sub: '123',
  nombre: 'Juan',
  apellido: 'Pérez',
  legajo: '12345',
  carrera: 'Sistemas',
  email: 'juan@frvm.utn.edu.ar',
  grupo: 'Alumno',
};

describe('CodeService', () => {
  let service: CodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'CODE_TTL_MS') return '120000';
              throw new Error(`Config key not found: ${key}`);
            },
          },
        },
      ],
    }).compile();

    service = module.get<CodeService>(CodeService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('generate', () => {
    it('debería generar un código único', () => {
      const code1 = service.generate(mockUserInfo, 1);
      const code2 = service.generate(mockUserInfo, 1);
      expect(code1).toBeDefined();
      expect(code2).toBeDefined();
      expect(code1).not.toBe(code2);
    });

    it('debería generar un string no vacío', () => {
      const code = service.generate(mockUserInfo, 1);
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });
  });

  describe('consume', () => {
    it('debería retornar el userInfo y clientId al consumir un código válido', () => {
      const code = service.generate(mockUserInfo, 42);
      const result = service.consume(code);
      expect(result).not.toBeNull();
      expect(result!.userInfo).toEqual(mockUserInfo);
      expect(result!.clientId).toBe(42);
    });

    it('debería retornar null al consumir un código inexistente', () => {
      const result = service.consume('codigo-inexistente');
      expect(result).toBeNull();
    });

    it('debería retornar null al consumir el mismo código dos veces (un solo uso)', () => {
      const code = service.generate(mockUserInfo, 1);
      service.consume(code);
      const result = service.consume(code);
      expect(result).toBeNull();
    });

    it('debería retornar null si el código expiró', () => {
      // Creamos un service con TTL de 1ms
      const fastService = new CodeService({
        getOrThrow: () => '1',
      } as any);

      const code = fastService.generate(mockUserInfo, 1);

      // Esperamos a que expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = fastService.consume(code);
          expect(result).toBeNull();
          fastService.onModuleDestroy();
          resolve();
        }, 10);
      });
    });
  });
});