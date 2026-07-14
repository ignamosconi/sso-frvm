import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { IOAuthClientService } from './oauth-client.service.interface.js';
import { OAuthClientEntity } from '../entities/oauth-client.entity.js';
import { CreateOAuthClientDto } from '../dtos/create-oauth-client.dto.js';
import { UpdateOAuthClientDto } from '../dtos/update-oauth-client.dto.js';
import { OAuthClientResponseDto } from '../dtos/oauth-client-response.dto.js';
import { OAuthClientCreatedResponseDto } from '../dtos/oauth-client-created-response.dto.js';
import { OAuthClientInfoDto } from '../dtos/oauth-client-info.dto.js';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class OAuthClientService implements IOAuthClientService {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(OAuthClientEntity)
    private readonly clientRepository: Repository<OAuthClientEntity>,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('MAIL_HOST'),
      port: this.configService.getOrThrow<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.getOrThrow<string>('MAIL_USER'),
        pass: this.configService.getOrThrow<string>('MAIL_PASS'),
      },
    });
  }

  // Mapea entidad a DTO de respuesta general (sin secret)
  private toResponseDto(entity: OAuthClientEntity): OAuthClientResponseDto {
    return {
      id: entity.id,
      clientName: entity.clientName,
      redirectUris: entity.redirectUris,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // Mapea entidad + plain secret al DTO de creación/regeneración
  private toCreatedResponseDto(entity: OAuthClientEntity, plainSecret: string): OAuthClientCreatedResponseDto {
    return {
      id: entity.id,
      clientName: entity.clientName,
      redirectUris: entity.redirectUris,
      plainSecret,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findAll(): Promise<OAuthClientResponseDto[]> {
    const entities = await this.clientRepository.find();
    return entities.map(e => this.toResponseDto(e));
  }

  async findOne(id: number): Promise<OAuthClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    return this.toResponseDto(client);
  }

  async findInfo(id: number): Promise<OAuthClientInfoDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    return { clientName: client.clientName };
  }

  async validateClient(id: number, secret: string, redirectUri: string): Promise<boolean> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) return false;
    // Comparación con tiempo constante via bcrypt
    const secretValid = await bcrypt.compare(secret, client.clientSecret);
    if (!secretValid) return false;
    if (!client.redirectUris.includes(redirectUri)) return false;
    return true;
  }

  async create(dto: CreateOAuthClientDto): Promise<OAuthClientCreatedResponseDto> {
    const plainSecret = randomBytes(32).toString('hex');
    const clientSecret = await bcrypt.hash(plainSecret, BCRYPT_ROUNDS);
    const entity = this.clientRepository.create({ ...dto, clientSecret });
    const saved = await this.clientRepository.save(entity);
    return this.toCreatedResponseDto(saved, plainSecret);
  }

  async update(id: number, dto: UpdateOAuthClientDto): Promise<OAuthClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    Object.assign(client, dto);
    const saved = await this.clientRepository.save(client);
    return this.toResponseDto(saved);
  }

  async remove(id: number): Promise<void> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    await this.clientRepository.remove(client);
  }

  async regenerateSecret(id: number): Promise<OAuthClientCreatedResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    const plainSecret = randomBytes(32).toString('hex');
    client.clientSecret = await bcrypt.hash(plainSecret, BCRYPT_ROUNDS);
    const saved = await this.clientRepository.save(client);
    return this.toCreatedResponseDto(saved, plainSecret);
  }

  async sendCredentialsByEmail(id: number, to: string): Promise<void> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);

    const from = this.configService.getOrThrow<string>('MAIL_FROM');
    const ssoUrl = this.configService.getOrThrow<string>('SSO_BASE_URL');
    const urisList = client.redirectUris.map(uri => `  • ${uri}`).join('\n');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `Credenciales OAuth — ${client.clientName}`,
        text: [
          `Credenciales de integración SSO FRVM para: ${client.clientName}`,
          '',
          '── Datos de tu cliente OAuth ──────────────────────────',
          `Client ID:     ${client.id}`,
          `Client Name:   ${client.clientName}`,
          '',
          'Redirect URIs registradas:',
          urisList,
          '',
          '► El Client Secret no se incluye en este email por seguridad.',
          'Podés verlo en el panel de administración inmediatamente después de',
          'crearlo o regenerarlo. Si lo perdiste, pedile al administrador que lo regenere.',
          '',
          '── Cómo integrar tu app con el SSO ────────────────────',
          '',
          '1. Abrí un popup al login del SSO:',
          `   ${ssoUrl}/sso/login?client_id=${client.id}&redirect_uri=TU_REDIRECT_URI&state=VALOR_ALEATORIO`,
          '',
          '2. Escuchá el postMessage en tu app:',
          '   window.addEventListener("message", (event) => {',
          `     if (event.origin !== "${ssoUrl}") return;`,
          '     const { code, state } = event.data;',
          '     // Verificá que state coincida con el que generaste',
          '     // Mandá el code a tu backend',
          '   });',
          '',
          '3. Desde tu backend, canjeá el code por tokens:',
          `   POST ${ssoUrl}/sso/token`,
          '   {',
          `     "client_id": "${client.id}",`,
          '     "client_secret": "TU_CLIENT_SECRET",',
          '     "code": "EL_CODE_RECIBIDO",',
          '     "redirect_uri": "TU_REDIRECT_URI"',
          '   }',
          '',
          '4. Usá el access_token para identificar al usuario:',
          `   GET ${ssoUrl}/sso/me`,
          '   Authorization: Bearer ACCESS_TOKEN',
          '',
          '5. Cuando el access_token expire, renovalo con el refresh_token:',
          `   POST ${ssoUrl}/sso/refresh`,
          '   { "refresh_token": "TU_REFRESH_TOKEN" }',
          '',
          '── Notas importantes ───────────────────────────────────',
          '• Guardá el Client Secret en tu backend, nunca en el frontend.',
          '• El code es de un solo uso y expira en 2 minutos.',
          '• Si perdés el Client Secret, pedile al administrador que lo regenere.',
          '• Para más detalles consultá el README del repositorio del SSO.',
        ].join('\n'),
      });
    } catch {
      throw new BadRequestException('Error al enviar el correo. Verificá la configuración de email.');
    }
  }
}