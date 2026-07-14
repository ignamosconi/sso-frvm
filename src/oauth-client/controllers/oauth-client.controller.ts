import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IOAuthClientController } from './oauth-client.controller.interface.js';
import type { IOAuthClientService } from '../services/oauth-client.service.interface.js';
import { CreateOAuthClientDto } from '../dtos/create-oauth-client.dto.js';
import { UpdateOAuthClientDto } from '../dtos/update-oauth-client.dto.js';
import { OAuthClientResponseDto } from '../dtos/oauth-client-response.dto.js';
import { OAuthClientCreatedResponseDto } from '../dtos/oauth-client-created-response.dto.js';
import { OAuthClientInfoDto } from '../dtos/oauth-client-info.dto.js';
import { SendCredentialsEmailDto } from '../dtos/send-credentials-email.dto.js';
import { AdminJwtGuard } from '../../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin — Clientes OAuth')
@Controller('admin/clients')
export class OAuthClientController implements IOAuthClientController {
  constructor(
    @Inject('IOAuthClientService')
    private readonly oauthClientService: IOAuthClientService,
  ) {}

  @ApiOperation({ summary: 'Listar todos los clientes OAuth' })
  @ApiResponse({ status: 200, type: [OAuthClientResponseDto] })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(AdminJwtGuard)
  @Get()
  findAll(): Promise<OAuthClientResponseDto[]> {
    return this.oauthClientService.findAll();
  }

  @ApiOperation({ summary: 'Obtener cliente OAuth por ID' })
  @ApiResponse({ status: 200, type: OAuthClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(AdminJwtGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OAuthClientResponseDto> {
    return this.oauthClientService.findOne(id);
  }

  @ApiOperation({
    summary: 'Obtener nombre público del cliente OAuth',
    description: 'Endpoint público. Usado por el HTML del popup para mostrar el nombre de la app.',
  })
  @ApiResponse({ status: 200, type: OAuthClientInfoDto })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @Get(':id/info')
  findInfo(@Param('id', ParseIntPipe) id: number): Promise<OAuthClientInfoDto> {
    return this.oauthClientService.findInfo(id);
  }

  @ApiOperation({ summary: 'Crear nuevo cliente OAuth' })
  @ApiResponse({ status: 201, type: OAuthClientCreatedResponseDto, description: 'El plainSecret solo es visible en esta respuesta.' })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(AdminJwtGuard)
  @Post()
  create(@Body() dto: CreateOAuthClientDto): Promise<OAuthClientCreatedResponseDto> {
    return this.oauthClientService.create(dto);
  }

  @ApiOperation({ summary: 'Actualizar cliente OAuth' })
  @ApiResponse({ status: 200, type: OAuthClientResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(AdminJwtGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOAuthClientDto,
  ): Promise<OAuthClientResponseDto> {
    return this.oauthClientService.update(id, dto);
  }

  @ApiOperation({ summary: 'Eliminar cliente OAuth' })
  @ApiResponse({ status: 200, description: 'Cliente eliminado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(AdminJwtGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.oauthClientService.remove(id);
  }

  @ApiOperation({ summary: 'Regenerar client secret' })
  @ApiResponse({ status: 201, type: OAuthClientCreatedResponseDto, description: 'El plainSecret solo es visible en esta respuesta.' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(AdminJwtGuard)
  @Post(':id/regenerate-secret')
  regenerateSecret(@Param('id', ParseIntPipe) id: number): Promise<OAuthClientCreatedResponseDto> {
    return this.oauthClientService.regenerateSecret(id);
  }

  @ApiOperation({ summary: 'Enviar credenciales por email' })
  @ApiResponse({ status: 201, description: 'Email enviado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 400, description: 'Error al enviar el email' })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(AdminJwtGuard)
  @Post(':id/send-credentials')
  sendCredentialsByEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendCredentialsEmailDto,
  ): Promise<void> {
    return this.oauthClientService.sendCredentialsByEmail(id, dto.to, dto.plainSecret);
  }
}