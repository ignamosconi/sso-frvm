import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ICodeService } from './code.service.interface.js';

interface CodeEntry {
  sub: string;
  clientId: number;
  expiresAt: number;
}

@Injectable()
export class CodeService implements ICodeService {
  private readonly codes = new Map<string, CodeEntry>();
  private readonly ttlMs: number;

  constructor(private readonly configService: ConfigService) {
    this.ttlMs = this.configService.getOrThrow<number>('CODE_TTL_MS');
  }

  generate(sub: string, clientId: number): string {
    const code = uuidv4();
    this.codes.set(code, {
      sub,
      clientId,
      expiresAt: Date.now() + this.ttlMs,
    });
    return code;
  }

  consume(code: string): { sub: string; clientId: number } | null {
    const entry = this.codes.get(code);
    this.codes.delete(code);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;

    return { sub: entry.sub, clientId: entry.clientId };
  }
}