import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ICodeService } from './code.service.interface.js';
import { UserInfoOauthDto } from '../../auth/dtos/user-info-oauth.dto.js';

interface CodeEntry {
  userInfo: UserInfoOauthDto;
  clientId: number;
  expiresAt: number;
}

@Injectable()
export class CodeService implements ICodeService {
  private readonly codes = new Map<string, CodeEntry>();
  private readonly ttlMs: number;

  constructor(private readonly configService: ConfigService) {
    this.ttlMs = parseInt(this.configService.getOrThrow<string>('CODE_TTL_MS'), 10);
  }

  generate(userInfo: UserInfoOauthDto, clientId: number): string {
    const code = uuidv4();
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
}