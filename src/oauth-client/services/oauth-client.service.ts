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
    const urisList = client.redirectUris.map(uri => `  • ${uri}`).join('\n');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `Credenciales OAuth - ${client.clientName}`,
        text: [
          `Credenciales de integración SSO FRVM para: ${client.clientName}`,
          '',
          `Client ID:     ${client.id}`,
          `Client Name:   ${client.clientName}`,
          `Client Secret: ${client.clientSecret}`,
          '',
          `Redirect URIs registradas:`,
          urisList,
          '',
          'Guardá el Client Secret en un lugar seguro. No lo compartas públicamente.',
          'Si necesitás regenerarlo, contactá al administrador del SSO.',
        ].join('\n'),
      });
    } catch {
      throw new BadRequestException('Error al enviar el correo. Verificá la configuración de email.');
    }
  }
}