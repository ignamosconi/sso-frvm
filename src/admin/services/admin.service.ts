import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IAdminService } from './admin.service.interface.js';
import { AdminEntity } from '../entities/admin.entity.js';
import { CreateAdminDto } from '../dtos/create-admin.dto.js';
import { UpdateAdminDto } from '../dtos/update-admin.dto.js';
import { AdminResponseDto } from '../dtos/admin-response.dto.js';

@Injectable()
export class AdminService implements IAdminService {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
  ) {}

  private toDto(entity: AdminEntity): AdminResponseDto {
    return {
      id: entity.id,
      username: entity.username,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findAll(): Promise<AdminResponseDto[]> {
    const admins = await this.adminRepository.find();
    return admins.map(a => this.toDto(a));
  }

  async findOne(id: string): Promise<AdminResponseDto> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) throw new NotFoundException(`Admin con id ${id} no encontrado.`);
    return this.toDto(admin);
  }

  async create(dto: CreateAdminDto): Promise<AdminResponseDto> {
    const exists = await this.adminRepository.findOne({ where: { username: dto.username } });
    if (exists) throw new ConflictException(`El username "${dto.username}" ya está en uso.`);
    const hashed = await bcrypt.hash(dto.password, 12);
    const entity = this.adminRepository.create({ username: dto.username, password: hashed });
    return this.toDto(await this.adminRepository.save(entity));
  }

  async update(id: string, dto: UpdateAdminDto): Promise<AdminResponseDto> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) throw new NotFoundException(`Admin con id ${id} no encontrado.`);
    if (dto.username) admin.username = dto.username;
    if (dto.password) admin.password = await bcrypt.hash(dto.password, 12);
    return this.toDto(await this.adminRepository.save(admin));
  }

  async remove(id: string): Promise<void> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) throw new NotFoundException(`Admin con id ${id} no encontrado.`);
    await this.adminRepository.remove(admin);
  }
}