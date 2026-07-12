import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Inject, UseGuards } from '@nestjs/common';
import { IOAuthClientController } from './oauth-client.controller.interface.js';
import type { IOAuthClientService } from '../services/oauth-client.service.interface.js';
import { CreateOAuthClientDto } from '../dtos/create-oauth-client.dto.js';
import { UpdateOAuthClientDto } from '../dtos/update-oauth-client.dto.js';
import { OAuthClientResponseDto } from '../dtos/oauth-client-response.dto.js';
import { OAuthClientInfoDto } from '../dtos/oauth-client-info.dto.js';
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard.js';

@Controller('admin/clients')
export class OAuthClientController implements IOAuthClientController {
  constructor(
    @Inject('IOAuthClientService')
    private readonly oauthClientService: IOAuthClientService,
  ) {}

  @UseGuards(AdminJwtGuard)
  @Get()
  findAll(): Promise<OAuthClientResponseDto[]> {
    return this.oauthClientService.findAll();
  }

  @UseGuards(AdminJwtGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OAuthClientResponseDto> {
    return this.oauthClientService.findOne(id);
  }

  // Endpoint público. Lo usa el HTML del login para mostrar el client_name.
  @Get(':id/info')
  findInfo(@Param('id', ParseIntPipe) id: number): Promise<OAuthClientInfoDto> {
    return this.oauthClientService.findInfo(id);
  }

  @UseGuards(AdminJwtGuard)
  @Post(':id/regenerate-secret')
  regenerateSecret(@Param('id', ParseIntPipe) id: number): Promise<OAuthClientResponseDto> {
    return this.oauthClientService.regenerateSecret(id);
  }

  @UseGuards(AdminJwtGuard)
  @Post()
  create(@Body() dto: CreateOAuthClientDto): Promise<OAuthClientResponseDto> {
    return this.oauthClientService.create(dto);
  }

  @UseGuards(AdminJwtGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOAuthClientDto,
  ): Promise<OAuthClientResponseDto> {
    return this.oauthClientService.update(id, dto);
  }

  @UseGuards(AdminJwtGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.oauthClientService.remove(id);
  }
}