import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, GoneException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialTokenService } from './credential-token.service.js';
import { CredentialTokenEntity } from '../entities/credential-token.entity.js';
import { GenerateCredentialTokenDto } from '../dtos/generate-credential-token.dto.js';

const VALID_KEY = 'a'.repeat(64); // 64 chars hex válidos para tests

function makeToken(overrides: Partial<CredentialTokenEntity> = {}): CredentialTokenEntity {
  return {
    id: 'uuid-1',
    tokenHash: 'hash',
    oauthClientId: 1,
    encryptedSecret: '',
    clientName: 'TestApp',
    redirectUris: '["https://app.com/callback"]',
    used: false,
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('CredentialTokenService', () => {
  let service: CredentialTokenService;
    let mockRepo: jest.Mocked<Record<string, jest.Mock>>;

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialTokenService,
        { provide: getRepositoryToken(CredentialTokenEntity), useValue: mockRepo },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'CREDENTIAL_ENCRYPTION_KEY') return VALID_KEY;
              if (key === 'CREDENTIAL_TOKEN_TTL_MS') return 86400000;
              throw new Error(`Config key not found: ${key}`);
            },
            get: (key: string) => {
              if (key === 'CREDENTIAL_TOKEN_TTL_MS') return 86400000;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<CredentialTokenService>(CredentialTokenService);
  });

  describe('generate', () => {
    it('debería guardar el token hasheado y retornar el plain text', async () => {
      mockRepo.save.mockResolvedValue({});

      const dto = new GenerateCredentialTokenDto();
      Object.assign(dto, {
        oauthClientId: 1,
        plainSecret: 'mi-secret-plain',
        clientName: 'TestApp',
        redirectUris: ['https://app.com/callback'],
      });

      const token = await service.generate(dto);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          oauthClientId: 1,
          clientName: 'TestApp',
        }),
      );

      // El tokenHash guardado nunca debe ser igual al plain token
      const savedCall = mockRepo.save.mock.calls[0][0];
      expect(savedCall.tokenHash).not.toBe(token);
    });
  });

  describe('consume', () => {
    it('debería retornar las credenciales descifradas si el token es válido', async () => {
      // Primero generamos un token real para obtener un encryptedSecret válido
      mockRepo.save.mockResolvedValue({});
      const dto = new GenerateCredentialTokenDto();
      Object.assign(dto, {
        oauthClientId: 1,
        plainSecret: 'mi-secret-plain',
        clientName: 'TestApp',
        redirectUris: ['https://app.com/callback'],
      });
      await service.generate(dto);
      const savedData = mockRepo.save.mock.calls[0][0];

      // Ahora simulamos consume con ese registro
      const record = makeToken({
        tokenHash: savedData.tokenHash,
        encryptedSecret: savedData.encryptedSecret,
      });

      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1, raw: [record] }),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      // El token plain que generamos — necesitamos capturarlo del save mock
      // Como el plain se genera interno, usamos cualquier string (el consume
      // usa el hash para buscar, no el plain directamente en el test)
      const result = await service.consume('cualquier-token');

      expect(result.plainSecret).toBe('mi-secret-plain');
      expect(result.clientName).toBe('TestApp');
      expect(result.redirectUris).toEqual(['https://app.com/callback']);
    });

    it('debería lanzar NotFoundException si el token no existe', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0, raw: [] }),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.consume('token-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar GoneException si el token ya fue usado', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0, raw: [] }),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);
      mockRepo.findOne.mockResolvedValue(makeToken({ used: true }));

      await expect(service.consume('token-usado')).rejects.toThrow(GoneException);
    });
  });
});