import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CredentialTokenEntity } from '../entities/credential-token.entity.js';
import { ICredentialTokenService } from './credential-token.service.interface.js';
import { GenerateCredentialTokenDto } from '../dtos/generate-credential-token.dto.js';
import { ConsumeCredentialTokenResultDto } from '../dtos/consume-credential-token-result.dto.js';

@Injectable()
export class CredentialTokenService implements ICredentialTokenService {
  private readonly encryptionKey: Buffer;
  private readonly ttlMs: number;

  constructor(
    @InjectRepository(CredentialTokenEntity)
    private readonly repo: Repository<CredentialTokenEntity>,
    private readonly configService: ConfigService,
  ) {
    const keyHex = this.configService.getOrThrow<string>('CREDENTIAL_ENCRYPTION_KEY');
    if (keyHex.length !== 64) {
      throw new Error('CREDENTIAL_ENCRYPTION_KEY debe ser exactamente 64 caracteres hex (32 bytes).');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
    this.ttlMs = parseInt(
      this.configService.get<string>('CREDENTIAL_TOKEN_TTL_MS') ?? '86400000',
      10,
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Cifra con AES-256-GCM. Devuelve "iv:authTag:ciphertext" en hex.
  private encrypt(plain: string): string {
    const iv = randomBytes(12); // 96 bits — recomendado para GCM
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  // Descifra el formato "iv:authTag:ciphertext".
  private decrypt(stored: string): string {
    const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  async generate(dto: GenerateCredentialTokenDto): Promise<string> {
    const plain = randomBytes(32).toString('hex');
    await this.repo.save({
      tokenHash: this.hashToken(plain),
      oauthClientId: dto.oauthClientId,
      encryptedSecret: this.encrypt(dto.plainSecret),
      clientName: dto.clientName,
      redirectUris: JSON.stringify(dto.redirectUris),
      expiresAt: new Date(Date.now() + this.ttlMs),
    });
    return plain;
  }

  async consume(token: string): Promise<ConsumeCredentialTokenResultDto> {
    const tokenHash = this.hashToken(token);

    const result = await this.repo
      .createQueryBuilder()
      .update(CredentialTokenEntity)
      .set({ used: true })
      .where('"tokenHash" = :tokenHash', { tokenHash })
      .andWhere('used = false')
      .andWhere('"expiresAt" > :now', { now: new Date() })
      .returning('*')
      .execute();

    if (result.affected === 0) {
      const existing = await this.repo.findOne({ where: { tokenHash } });

      if (!existing) {
        throw new NotFoundException('El link no es válido.');
      }

      if (existing.used) {
        throw new GoneException('Este link ya fue utilizado.');
      }

      throw new GoneException('Este link ha expirado.');
    }

    const raw: unknown = result.raw;

    if (!Array.isArray(raw) || raw.length === 0) {
      throw new NotFoundException('No se pudo obtener el token.');
    }

    const record = raw[0] as CredentialTokenEntity;

    const parsedRedirectUris: unknown = JSON.parse(record.redirectUris);

    if (
      !Array.isArray(parsedRedirectUris) ||
      !parsedRedirectUris.every((uri): uri is string => typeof uri === 'string')
    ) {
      throw new Error('Los redirect URIs almacenados no tienen un formato válido.');
    }

    return {
      oauthClientId: record.oauthClientId,
      plainSecret: this.decrypt(record.encryptedSecret),
      clientName: record.clientName,
      redirectUris: parsedRedirectUris,
    }
  }
}