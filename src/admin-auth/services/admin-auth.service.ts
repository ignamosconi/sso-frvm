import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { IAdminAuthService } from './admin-auth.service.interface.js';
import { AdminEntity } from '../../admin/entities/admin.entity.js';
import { AdminLoginRequestDto } from '../dtos/admin-login-request.dto.js';
import { AdminRefreshRequestDto } from '../dtos/admin-refresh-request.dto.js';
import { AdminLogoutRequestDto } from '../dtos/admin-logout-request.dto.js';
import { TokenResponseDto } from '../../auth/dtos/token-response.dto.js';
import type { IRefreshTokenService } from '../../refresh-token/services/refresh-token.service.interface.js';

@Injectable()
export class AdminAuthService implements IAdminAuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

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
    this.accessExpiresIn = this.configService.getOrThrow<string>('JWT_ADMIN_ACCESS_EXPIRES_IN');
    this.refreshExpiresIn = this.configService.getOrThrow<string>('JWT_ADMIN_REFRESH_EXPIRES_IN');
  }

  async login(dto: AdminLoginRequestDto): Promise<TokenResponseDto> {
    const admin = await this.adminRepository.findOne({ where: { username: dto.username } });
    if (!admin) throw new UnauthorizedException('Credenciales inválidas.');

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas.');

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { sub: admin.id, username: admin.username },
        { secret: this.accessSecret, expiresIn: this.accessExpiresIn as any },
      ),
      this.jwtService.signAsync(
        { sub: admin.id },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn as any },
      ),
    ]);

    // Guardar refresh token en DB (inicio de nueva familia)
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

  async refresh(dto: AdminRefreshRequestDto): Promise<TokenResponseDto> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(dto.refresh_token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    // Consumir en DB (detecta reutilización y revoca familia si es necesario)
    const record = await this.refreshTokenService.consume(dto.refresh_token);

    const admin = await this.adminRepository.findOne({ where: { id: payload.sub } });
    if (!admin) throw new UnauthorizedException('Admin no encontrado.');

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: admin.id, username: admin.username },
        { secret: this.accessSecret, expiresIn: this.accessExpiresIn as any },
      ),
      this.jwtService.signAsync(
        { sub: admin.id },
        { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn as any },
      ),
    ]);

    // Guardar nuevo refresh token en la misma familia
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