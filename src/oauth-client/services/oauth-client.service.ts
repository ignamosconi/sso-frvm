import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IOAuthClientService } from './oauth-client.service.interface.js';
import { OAuthClientEntity } from '../entities/oauth-client.entity.js';
import { CreateOAuthClientDto } from '../dtos/create-oauth-client.dto.js';
import { UpdateOAuthClientDto } from '../dtos/update-oauth-client.dto.js';
import { OAuthClientResponseDto } from '../dtos/oauth-client-response.dto.js';
import { OAuthClientInfoDto } from '../dtos/oauth-client-info.dto.js';

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

  async findAll(): Promise<OAuthClientResponseDto[]> {
    return this.clientRepository.find();
  }

  async findOne(id: number): Promise<OAuthClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    return client;
  }

  async findInfo(id: number): Promise<OAuthClientInfoDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    return { clientName: client.clientName };
  }

  async validateClient(id: number, secret: string, redirectUri: string): Promise<boolean> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) return false;
    if (client.clientSecret !== secret) return false;
    if (!client.redirectUris.includes(redirectUri)) return false;
    return true;
  }

  async create(dto: CreateOAuthClientDto): Promise<OAuthClientResponseDto> {
    const clientSecret = randomBytes(32).toString('hex');
    const entity = this.clientRepository.create({ ...dto, clientSecret });
    return this.clientRepository.save(entity);
  }

  async update(id: number, dto: UpdateOAuthClientDto): Promise<OAuthClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    Object.assign(client, dto);
    return this.clientRepository.save(client);
  }

  async remove(id: number): Promise<void> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    await this.clientRepository.remove(client);
  }

  async regenerateSecret(id: number): Promise<OAuthClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    client.clientSecret = randomBytes(32).toString('hex');
    return this.clientRepository.save(client);
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
          `Client Secret: ${client.clientSecret}`,
          '',
          'Redirect URIs registradas:',
          urisList,
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
          `     "client_secret": "TU_CLIENT_SECRET",`,
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