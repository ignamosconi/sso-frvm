import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { RefreshTokenEntity } from '../entities/refresh-token.entity.js';
import { IRefreshTokenService } from './refresh-token.service.interface.js';

@Injectable()
export class RefreshTokenService implements IRefreshTokenService{

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repo: Repository<RefreshTokenEntity>,
  ) {}

  // Hashea el token para guardarlo en DB (nunca guardamos el token en claro)
  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Parsea el string de expiración (ej: "1d", "7d", "15m") a una Date
  private toDate(expiresIn: string): Date {
    const unit = expiresIn.slice(-1);
    const amount = parseInt(expiresIn.slice(0, -1), 10);
    const ms = unit === 's' ? amount * 1000
              : unit === 'm' ? amount * 60 * 1000
              : unit === 'h' ? amount * 60 * 60 * 1000
              : unit === 'd' ? amount * 60 * 60 * 24 * 1000
              : parseInt(expiresIn, 10) * 1000;
    return new Date(Date.now() + ms);
  }

  // Guarda un nuevo refresh token. Si no se pasa familyId, inicia una nueva familia.
  async save(params: {
    token: string;
    sub: string;
    type: 'student' | 'admin';
    expiresIn: string;
    familyId?: string;
  }): Promise<void> {
    await this.repo.save({
      tokenHash: this.hash(params.token),
      familyId: params.familyId ?? randomUUID(),
      sub: params.sub,
      type: params.type,
      expiresAt: this.toDate(params.expiresIn),
    });
  }

  // Valida el token y devuelve el registro. Maneja detección de reutilización.
    async consume(token: string): Promise<RefreshTokenEntity> {
    const tokenHash = this.hash(token);

    // Atómicamente marca el token como usado solo si todavía no lo fue
    // y no está revocado. Solo una query concurrente puede ganar esto.
    const result = await this.repo
      .createQueryBuilder()
      .update(RefreshTokenEntity)
      .set({ used: true })
      .where('tokenHash = :tokenHash', { tokenHash })
      .andWhere('used = false')
      .andWhere('revoked = false')
      .returning('*')
      .execute();

    // Ninguna fila actualizada: el token no existe, ya fue usado, o está revocado.
    // Necesitamos distinguir "ya usado" (posible robo) de "no existe / revocado".
    if (result.affected === 0) {
      // Buscar el registro para saber qué pasó y actuar en consecuencia
      const existing = await this.repo.findOne({ where: { tokenHash } });

      if (existing?.used) {
        // Reutilización detectada → revocar toda la familia
        await this.repo.update({ familyId: existing.familyId }, { revoked: true });
        throw new UnauthorizedException('Refresh token ya utilizado. Sesión revocada por seguridad.');
      }

      // No existe, revocado, o expirado — mismo mensaje hacia el cliente
      throw new UnauthorizedException('Refresh token inválido o revocado.');
    }

    const record: RefreshTokenEntity = result.raw[0];

    // Verificar expiración después del UPDATE (el índice no filtra por fecha)
    if (new Date(record.expiresAt) < new Date()) {
      // Revocar para no dejar el token en estado "usado pero expirado" sin revocar
      await this.repo.update({ familyId: record.familyId }, { revoked: true });
      throw new UnauthorizedException('Refresh token expirado.');
    }

    return record;
  }

  // Revoca toda la familia (logout)
  async revokeFamily(token: string): Promise<void> {
    const tokenHash = this.hash(token);
    const record = await this.repo.findOne({ where: { tokenHash } });
    if (!record) return;
    await this.repo.update({ familyId: record.familyId }, { revoked: true });
  }

  async revokeAllForSub(sub: string, manager?: EntityManager): Promise<void> {
    const repo = manager
      ? manager.getRepository(RefreshTokenEntity)
      : this.repo;
    await repo.update({ sub, revoked: false }, { revoked: true });
  }

  // Limpieza periódica de tokens viejos (llamar desde un cron si se quiere)
  async purgeExpired(): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .delete()
      .where('"expiresAt" < :now', { now: new Date() })
      .execute();
  }
}