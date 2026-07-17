import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { IAdminAuthService } from './admin-auth.service.interface.js';
import { AdminEntity } from '../../admin/entities/admin.entity.js';
import { AdminLoginRequestDto } from '../dtos/admin-login-request.dto.js';
import { AdminLoginResponseDto } from '../dtos/admin-login-response.dto.js';
import { Admin2faSetupRequestDto } from '../dtos/admin-2fa-setup-request.dto.js';
import { Admin2faSetupResponseDto } from '../dtos/admin-2fa-setup-response.dto.js';
import { Admin2faConfirmDto } from '../dtos/admin-2fa-confirm.dto.js';
import { Admin2faValidateDto } from '../dtos/admin-2fa-validate.dto.js';
import { AdminRefreshRequestDto } from '../dtos/admin-refresh-request.dto.js';
import { AdminLogoutRequestDto } from '../dtos/admin-logout-request.dto.js';
import { TokenResponseDto } from '../../auth/dtos/token-response.dto.js';
import type { IRefreshTokenService } from '../../refresh-token/services/refresh-token.service.interface.js';
import { Admin2faResetDto } from '../dtos/admin-2fa-reset.dto.js';

@Injectable()
export class AdminAuthService implements IAdminAuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly pendingSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly totpEncryptionKey: Buffer;

  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('IRefreshTokenService')
    private readonly refreshTokenService: IRefreshTokenService,
  ) {
    this.accessSecret = this.configService.getOrThrow<string>('JWT_ADMIN_ACCESS_SECRET');
    this.refreshSecret = this.configService.getOrThrow<string>('JWT_ADMIN_REFRESH_SECRET');
    // El pending token usa el mismo secret que el access pero con type distinto,
    // así el AdminJwtGuard lo rechaza (solo acepta type 'access')
    this.pendingSecret = this.accessSecret;
    this.accessExpiresIn = this.configService.getOrThrow<string>('JWT_ADMIN_ACCESS_EXPIRES_IN');
    this.refreshExpiresIn = this.configService.getOrThrow<string>('JWT_ADMIN_REFRESH_EXPIRES_IN');

    const keyHex = this.configService.getOrThrow<string>('TOTP_ENCRYPTION_KEY');
    if (keyHex.length !== 64) {
      throw new Error('TOTP_ENCRYPTION_KEY debe ser exactamente 64 caracteres hex (32 bytes).');
    }
    this.totpEncryptionKey = Buffer.from(keyHex, 'hex');
  }

  // ── Cifrado AES-256-GCM para el secret TOTP ──────────────────────────────

  private encryptTotp(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.totpEncryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptTotp(stored: string): string {
    const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.totpEncryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  // ── Pending token ─────────────────────────────────────────────────────────

  private issuePendingToken(adminId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: adminId, type: 'pending-2fa' },
      { secret: this.pendingSecret, expiresIn: '5m' },
    );
  }

  private async verifyPendingToken(token: string): Promise<{ sub: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; type: string }>(token, {
        secret: this.pendingSecret,
      });
      if (payload.type !== 'pending-2fa') {
        throw new UnauthorizedException('Token inválido.');
      }
      return { sub: payload.sub };
    } catch {
      throw new UnauthorizedException('Token de sesión pendiente inválido o expirado.');
    }
  }

  // ── Emisión de tokens reales ──────────────────────────────────────────────

  private async issueTokenPair(admin: AdminEntity): Promise<TokenResponseDto> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { sub: admin.id, username: admin.username, type: 'access' },
        { secret: this.accessSecret, expiresIn: this.accessExpiresIn as any },
      ),
      this.jwtService.signAsync(
        { sub: admin.id, type: 'refresh' },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn as any },
      ),
    ]);

    await this.refreshTokenService.save({
      token: refresh_token,
      sub: admin.id,
      type: 'admin',
      expiresIn: this.refreshExpiresIn,
    });

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(this.accessExpiresIn),
    };
  }

  // ── Métodos públicos ──────────────────────────────────────────────────────

  async login(dto: AdminLoginRequestDto): Promise<AdminLoginResponseDto> {
    const admin = await this.adminRepository.findOne({ where: { username: dto.username } });
    if (!admin) throw new UnauthorizedException('Credenciales inválidas.');

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas.');

    const pending_token = await this.issuePendingToken(admin.id);

    return {
      pending_token,
      requires_2fa_setup: !admin.totpEnabled,
    };
  }

  async setup2fa(dto: Admin2faSetupRequestDto): Promise<Admin2faSetupResponseDto> {
    const { sub } = await this.verifyPendingToken(dto.pending_token);

    const admin = await this.adminRepository.findOne({ where: { id: sub } });
    if (!admin) throw new UnauthorizedException('Admin no encontrado.');

    // Generar nuevo secret TOTP
    const plainSecret = authenticator.generateSecret();
    admin.totpSecret = this.encryptTotp(plainSecret);
    // No activamos todavía — se activa en confirm2fa
    await this.adminRepository.save(admin);

    const otpAuthUrl = authenticator.keyuri(admin.username, 'SSO FRVM', plainSecret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return {
      qrCodeDataUrl,
      manualEntrySecret: plainSecret,
    };
  }

  async confirm2fa(dto: Admin2faConfirmDto): Promise<TokenResponseDto> {
    const { sub } = await this.verifyPendingToken(dto.pending_token);

    const admin = await this.adminRepository.findOne({ where: { id: sub } });
    if (!admin || !admin.totpSecret) {
      throw new UnauthorizedException('Primero debés configurar el 2FA con /2fa/setup.');
    }

    const plainSecret = this.decryptTotp(admin.totpSecret);
    const isValid = authenticator.verify({ token: dto.totp_code, secret: plainSecret });
    if (!isValid) throw new UnauthorizedException('Código 2FA inválido.');

    // Activar 2FA definitivamente
    admin.totpEnabled = true;
    await this.adminRepository.save(admin);

    return this.issueTokenPair(admin);
  }

  async validate2fa(dto: Admin2faValidateDto): Promise<TokenResponseDto> {
    const { sub } = await this.verifyPendingToken(dto.pending_token);

    const admin = await this.adminRepository.findOne({ where: { id: sub } });
    if (!admin || !admin.totpEnabled || !admin.totpSecret) {
      throw new UnauthorizedException('2FA no configurado para este admin.');
    }

    const plainSecret = this.decryptTotp(admin.totpSecret);
    const isValid = authenticator.verify({ token: dto.totp_code, secret: plainSecret });
    if (!isValid) throw new UnauthorizedException('Código 2FA inválido.');

    return this.issueTokenPair(admin);
  }

    async reset2fa(adminId: string, dto: Admin2faResetDto): Promise<void> {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('Admin no encontrado.');

    // Re-autenticar con password antes de permitir el reset
    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) throw new UnauthorizedException('Password incorrecta.');

    // El secret TOTP queda invalidado en el servidor. El secret anterior puede
    // seguir en el dispositivo del admin, pero el servidor ya no lo conoce.
    // La sesión activa (access + refresh tokens) no se revoca intencionalmente:
    // el admin que llama a este endpoint ya completó los dos factores para obtener
    // su access token, por lo que su sesión es legítima y no debe interrumpirse.
    // El access token vigente expira solo (máx. JWT_ADMIN_ACCESS_EXPIRES_IN).
    admin.totpSecret = null;
    admin.totpEnabled = false;
    await this.adminRepository.save(admin);
  }

  async refresh(dto: AdminRefreshRequestDto): Promise<TokenResponseDto> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; type: string }>(dto.refresh_token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('El token proporcionado no es un refresh token.');
    }

    const record = await this.refreshTokenService.consume(dto.refresh_token);

    const admin = await this.adminRepository.findOne({ where: { id: payload.sub } });
    if (!admin) throw new UnauthorizedException('Admin no encontrado.');

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: admin.id, username: admin.username, type: 'access' },
        { secret: this.accessSecret, expiresIn: this.accessExpiresIn as any },
      ),
      this.jwtService.signAsync(
        { sub: admin.id, type: 'refresh' },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn as any },
      ),
    ]);

    await this.refreshTokenService.save({
      token: newRefreshToken,
      sub: admin.id,
      type: 'admin',
      expiresIn: this.refreshExpiresIn,
      familyId: record.familyId,
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(this.accessExpiresIn),
    };
  }

  async logout(dto: AdminLogoutRequestDto): Promise<void> {
    await this.refreshTokenService.revokeFamily(dto.refresh_token);
  }

  private parseExpiresIn(value: string): number {
    const unit = value.slice(-1);
    const amount = parseInt(value.slice(0, -1), 10);
    switch (unit) {
      case 's': return amount;
      case 'm': return amount * 60;
      case 'h': return amount * 60 * 60;
      case 'd': return amount * 60 * 60 * 24;
      default:  return parseInt(value, 10);
    }
  }
}