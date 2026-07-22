import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { IOAuthClientService } from './oauth-client.service.interface.js';
import type { ICredentialTokenService } from '../../credential-token/services/credential-token.service.interface.js';
import { GenerateCredentialTokenDto } from '../../credential-token/dtos/generate-credential-token.dto.js';
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
    @Inject('ICredentialTokenService')
    private readonly credentialTokenService: ICredentialTokenService,
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
      isActive: entity.isActive,
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
    if (!client.isActive) return false;
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

  async sendCredentialsByEmail(id: number, to: string, plainSecret: string): Promise<void> {
    const credentialTokenTtlMs = this.configService.getOrThrow<number>('CREDENTIAL_TOKEN_TTL_MS');
    const credentialTokenTtlHours = credentialTokenTtlMs / (1000 * 60 * 60);

    //Formateamos para que se vea hora y minuto
    const credentialTokenTtlText = Number.isInteger(credentialTokenTtlHours)
      ? `${credentialTokenTtlHours} hora${credentialTokenTtlHours === 1 ? '' : 's'}`
      : `${credentialTokenTtlHours.toFixed(1)} horas`;

    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);

    const from = this.configService.getOrThrow<string>('MAIL_FROM');
    const ssoUrl = this.configService.getOrThrow<string>('SSO_BASE_URL');

    // Generar link de un solo uso con el secret cifrado

    // LIMITACIÓN CONOCIDA: el plainSecret que llega acá no se valida contra la DB
    // porque el backend nunca almacena el secret en texto plano (solo su hash bcrypt).
    // Un admin podría pasar un plainSecret distinto al real, lo que haría que el
    // destinatario reciba credenciales incorrectas y tenga que volver a solicitarlas.
    // Como mucho un cliente tendría que pedir regenerar el secret, asique no hay impacto
    // de seguridad (no se expone información sensible ni se otorga acceso indebido).
    // Se asume este riesgo porque los administradores del sistema son personal de confianza
    // de UTN FRVM, y el sistema es de uso interno.
    const generateDto = new GenerateCredentialTokenDto();
    Object.assign(generateDto, {
      oauthClientId: client.id,
      plainSecret,
      clientName: client.clientName,
      redirectUris: client.redirectUris,
    });
    const token = await this.credentialTokenService.generate(generateDto);
    const credentialsUrl = `${ssoUrl}/credentials/${token}`;

    const urisList = client.redirectUris.map(uri => `  • ${uri}`).join('\n');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `Credenciales OAuth - ${client.clientName}`,
        text: [
          `Credenciales de integración SSO FRVM para: ${client.clientName}`,
          '',
          '── Tu link de credenciales ─────────────────────────────',
          '',
          `${credentialsUrl}`,
          '',
          `⚠️  Este link es de UN SOLO USO y expira en ${credentialTokenTtlText}.`,
          'Abrilo, guardá el Client Secret en un lugar seguro y no lo compartas.',
          '',
          '── Datos conocidos de tu cliente OAuth ─────────────────',
          `Client ID:   ${client.id}`,
          `Client Name: ${client.clientName}`,
          '',
          'Redirect URIs registradas:',
          urisList,
          '',
          '── Cómo integrar tu app con el SSO ────────────────────',
          '',
          '1. Abrí un popup al login del SSO (puede ser con theme=light o theme=dark):',
          `   ${ssoUrl}/sso/login?client_id=${client.id}&redirect_uri=TU_REDIRECT_URI&state=VALOR_ALEATORIO&theme=dark `,
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
          '5. Renovar el access_token cuando expire (cada 15 minutos):',
          `   POST ${ssoUrl}/sso/refresh`,
          '   { "refresh_token": "TU_REFRESH_TOKEN" }',
          '   → Obtenés un nuevo access_token Y un nuevo refresh_token.',
          '   → IMPORTANTE: reemplazá AMBOS tokens almacenados con los nuevos.',
          '   → El refresh_token anterior queda inválido tras el canje.',
          '',
          '6. Cerrar sesión del alumno voluntariamente:',
          `   POST ${ssoUrl}/sso/logout`,
          '   { "refresh_token": "TU_REFRESH_TOKEN" }',
          '   → Además de llamar a este endpoint, eliminá los tokens de sessionStorage.',
          '',
          '── Notas importantes ────────────────',
          '• Guardá access_token y refresh_token en sessionStorage (no localStorage).',
          '• Nunca guardes el Client Secret en el frontend.',
          '• El code es de un solo uso y expira en 2 minutos.',
          '• El state lo generás aleatoriamente vos. Verificá que el SSO devuelva el mismo valor.',
          '• Si perdés el Client Secret, pedile al administrador que lo regenere.',
          '• Para más detalles consultá https://github.com/ignamosconi/sso-frvm/',
          '',
          '── Gestión de sesión ────────────────',
          '• La app debería cerrar la sesión automáticamente por cualquiera de estas razones:',
          '  1. El alumno cierra la pestaña (ya que sessionStorage se borra).',
          '  2. El alumno hace logout → La app llama a /logout y se revocan los tokens en SSO.',
          '  3. Inactividad: si el refresh_token no se usa por 8 horas, expira.',
          '  4. Duración absoluta: la sesión tiene un límite máximo de 3 días.',
          '  5. Reutilización detectada: si un refresh_token ya usado se vuelve a usar,',
          '     toda la familia de tokens queda revocada por seguridad.',
          '',
        ].join('\n'),
      });
    } catch {
      throw new BadRequestException('Error al enviar el correo. Verificá la configuración de email.');
    }
  }

  async suspend(id: number): Promise<OAuthClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    client.isActive = false;
    const saved = await this.clientRepository.save(client);
    return this.toResponseDto(saved);
  }

  async activate(id: number): Promise<OAuthClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    client.isActive = true;
    const saved = await this.clientRepository.save(client);
    return this.toResponseDto(saved);
  }
}