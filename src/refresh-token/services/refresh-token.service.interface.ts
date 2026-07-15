import { RefreshTokenEntity } from '../entities/refresh-token.entity.js';

export interface SaveRefreshTokenParams {
  token: string;
  sub: string;
  type: 'student' | 'admin';
  expiresIn: string;
  familyId?: string;
}

export interface IRefreshTokenService {
  save(params: SaveRefreshTokenParams): Promise<void>;
  consume(token: string): Promise<RefreshTokenEntity>;
  revokeFamily(token: string): Promise<void>;
  revokeAllForSub(sub: string): Promise<void>;
  purgeExpired(): Promise<void>;
}