import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ICodeService } from './code.service.interface.js';
import { UserInfoOauthDto } from '../../auth/dtos/user-info-oauth.dto.js';


interface CodeEntry {
  userInfo: UserInfoOauthDto;
  clientId: number;
  expiresAt: number;
}

@Injectable()
export class CodeService implements ICodeService, OnModuleDestroy {
  private readonly codes = new Map<string, CodeEntry>();
  private readonly ttlMs: number;
  private readonly purgeInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.ttlMs = parseInt(this.configService.getOrThrow<string>('CODE_TTL_MS'), 10);
    this.purgeInterval = setInterval(() => this.purgeExpired(), 60_000);
  }

  onModuleDestroy(): void {
    clearInterval(this.purgeInterval);
  }

  generate(userInfo: UserInfoOauthDto, clientId: number): string {
    const code = randomUUID();
    this.codes.set(code, { userInfo, clientId, expiresAt: Date.now() + this.ttlMs });
    return code;
  }

  consume(code: string): { userInfo: UserInfoOauthDto; clientId: number } | null {
    const entry = this.codes.get(code);
    this.codes.delete(code);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;
    return { userInfo: entry.userInfo, clientId: entry.clientId };
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [code, entry] of this.codes.entries()) {
      if (now > entry.expiresAt) {
        this.codes.delete(code);
      }
    }
  }
}