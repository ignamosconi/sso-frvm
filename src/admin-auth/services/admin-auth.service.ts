import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { IAdminAuthService } from './admin-auth.service.interface.js';
import { AdminEntity } from '../../admin/entities/admin.entity.js';
import { AdminLoginRequestDto } from '../dtos/admin-login-request.dto.js';
import { AdminRefreshRequestDto } from '../dtos/admin-refresh-request.dto.js';
import { TokenResponseDto } from '../../auth/dtos/token-response.dto.js';

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

    const admin = await this.adminRepository.findOne({ where: { id: payload.sub } });
    if (!admin) throw new UnauthorizedException('Admin no encontrado.');

    const newAccessToken = await this.jwtService.signAsync(
      { sub: admin.id, username: admin.username },
      { secret: this.accessSecret, expiresIn: this.accessExpiresIn as any },
    );

    return {
      access_token: newAccessToken,
      refresh_token: dto.refresh_token,
      token_type: 'Bearer',
      expires_in: this.parseExpiresIn(this.accessExpiresIn),
    };
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