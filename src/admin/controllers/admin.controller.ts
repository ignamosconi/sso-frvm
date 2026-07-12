import { Controller, Get, Post, Patch, Delete, Body, Param, Inject, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { IAdminController } from './admin.controller.interface.js';
import type { IAdminService } from '../services/admin.service.interface.js';
import { CreateAdminDto } from '../dtos/create-admin.dto.js';
import { UpdateAdminDto } from '../dtos/update-admin.dto.js';
import { AdminResponseDto } from '../dtos/admin-response.dto.js';
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard.js';

@UseGuards(AdminJwtGuard)
@Controller('admin/admins')
export class AdminController implements IAdminController {
  constructor(
    @Inject('IAdminService')
    private readonly adminService: IAdminService,
  ) {}

  @Get()
  findAll(): Promise<AdminResponseDto[]> {
    return this.adminService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AdminResponseDto> {
    return this.adminService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdminDto): Promise<AdminResponseDto> {
    return this.adminService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminDto): Promise<AdminResponseDto> {
    return this.adminService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.adminService.remove(id);
  }
}