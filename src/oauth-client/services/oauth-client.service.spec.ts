jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthClientService } from './oauth-client.service.js';
import { OAuthClientEntity } from '../entities/oauth-client.entity.js';
import * as bcrypt from 'bcrypt';

function makeClient(overrides: Partial<OAuthClientEntity> = {}): OAuthClientEntity {
  return {
    id: 1,
    clientName: 'TestApp',
    redirectUris: ['https://app.com/callback'],
    clientSecret: '$2b$10$hashedsecret',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('OAuthClientService', () => {
  let service: OAuthClientService;
  let mockRepo: jest.Mocked<any>;
  let mockCredentialTokenService: jest.Mocked<any>;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockCredentialTokenService = {
      generate: jest.fn().mockResolvedValue('one-time-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthClientService,
        { provide: getRepositoryToken(OAuthClientEntity), useValue: mockRepo },
        { provide: 'ICredentialTokenService', useValue: mockCredentialTokenService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const map: Record<string, string | number> = {
                MAIL_HOST: 'smtp.test.com',
                MAIL_PORT: 587,
                MAIL_USER: 'test@test.com',
                MAIL_PASS: 'pass',
                MAIL_FROM: 'test@test.com',
                SSO_BASE_URL: 'http://localhost:3000',
                CREDENTIAL_TOKEN_TTL_MS: 86400000,
              };
              if (key in map) return map[key];
              throw new Error(`Config key not found: ${key}`);
            },
          },
        },
      ],
    }).compile();

    service = module.get<OAuthClientService>(OAuthClientService);
  });

  describe('findAll', () => {
    it('debería retornar todos los clientes sin clientSecret', async () => {
      mockRepo.find.mockResolvedValue([makeClient()]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('clientSecret');
    });
  });

  describe('findOne', () => {
    it('debería retornar el cliente si existe', async () => {
      mockRepo.findOne.mockResolvedValue(makeClient());
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
      expect(result.clientName).toBe('TestApp');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateClient', () => {
    it('debería retornar true con credenciales válidas y cliente activo', async () => {
      mockRepo.findOne.mockResolvedValue(makeClient());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateClient(1, 'plain-secret', 'https://app.com/callback');
      expect(result).toBe(true);
    });

    it('debería retornar false si el cliente está suspendido', async () => {
      mockRepo.findOne.mockResolvedValue(makeClient({ isActive: false }));
      const result = await service.validateClient(1, 'plain-secret', 'https://app.com/callback');
      expect(result).toBe(false);
    });

    it('debería retornar false si el secret no coincide', async () => {
      mockRepo.findOne.mockResolvedValue(makeClient());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateClient(1, 'wrong-secret', 'https://app.com/callback');
      expect(result).toBe(false);
    });

    it('debería retornar false si el redirectUri no está registrado', async () => {
      mockRepo.findOne.mockResolvedValue(makeClient());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateClient(1, 'plain-secret', 'https://otro.com/callback');
      expect(result).toBe(false);
    });

    it('debería retornar false si el cliente no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.validateClient(999, 'plain-secret', 'https://app.com/callback');
      expect(result).toBe(false);
    });
  });

  describe('suspend / activate', () => {
    it('debería suspender un cliente activo', async () => {
      const client = makeClient();
      mockRepo.findOne.mockResolvedValue(client);
      mockRepo.save.mockResolvedValue({ ...client, isActive: false });

      const result = await service.suspend(1);
      expect(result.isActive).toBe(false);
    });

    it('debería activar un cliente suspendido', async () => {
      const client = makeClient({ isActive: false });
      mockRepo.findOne.mockResolvedValue(client);
      mockRepo.save.mockResolvedValue({ ...client, isActive: true });

      const result = await service.activate(1);
      expect(result.isActive).toBe(true);
    });

    it('debería lanzar NotFoundException al suspender un cliente inexistente', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.suspend(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('regenerateSecret', () => {
    it('debería retornar un nuevo plainSecret y no exponer el hash', async () => {
      const client = makeClient();
      mockRepo.findOne.mockResolvedValue(client);
      mockRepo.save.mockResolvedValue({ ...client, clientSecret: '$2b$10$newhash' });

      const result = await service.regenerateSecret(1);
      expect(result.plainSecret).toBeDefined();
      expect(result.plainSecret.length).toBe(64); // 32 bytes en hex
      expect(result).not.toHaveProperty('clientSecret');
    });
  });
});