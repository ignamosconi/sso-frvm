import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { IOAuthClientService } from './oauth-client.service.interface.js';
import { OAuthClientEntity } from '../entities/oauth-client.entity.js';
import { CreateOAuthClientDto } from '../dtos/create-oauth-client.dto.js';
import { UpdateOAuthClientDto } from '../dtos/update-oauth-client.dto.js';
import { OAuthClientResponseDto } from '../dtos/oauth-client-response.dto.js';
import { OAuthClientInfoDto } from '../dtos/oauth-client-info.dto.js';

@Injectable()
export class OAuthClientService implements IOAuthClientService {
  constructor(
    @InjectRepository(OAuthClientEntity)
    private readonly clientRepository: Repository<OAuthClientEntity>,
  ) {}

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
    if (client.redirectUri !== redirectUri) return false;
    return true;
  }

  async create(dto: CreateOAuthClientDto): Promise<OAuthClientResponseDto> {
    const clientSecret = randomBytes(32).toString('hex'); // 256 bits
    const entity = this.clientRepository.create({ ...dto, clientSecret });
    return this.clientRepository.save(entity);
  }

  async update(id: number, dto: UpdateOAuthClientDto): Promise<OAuthClientResponseDto> {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    return this.clientRepository.save(client);
  }

  async remove(id: number): Promise<void> {
    const client = await this.findOne(id);
    await this.clientRepository.remove(client as OAuthClientEntity);
  }

  async regenerateSecret(id: number): Promise<OAuthClientResponseDto> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente OAuth con id ${id} no encontrado.`);
    client.clientSecret = randomBytes(32).toString('hex');
    return this.clientRepository.save(client);
  }
}