import { Controller, Get, Param, Res, Inject, HttpCode } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { join } from 'path';
import { ICredentialTokenController } from './credential-token.controller.interface.js';
import type { ICredentialTokenService } from '../services/credential-token.service.interface.js';
import { CredentialDataResponseDto } from '../dtos/credential-data-response.dto.js';
import { ConsumeCredentialTokenResultDto } from '../dtos/consume-credential-token-result.dto.js';

@ApiTags('Credenciales')
@Controller('credentials')
export class CredentialTokenController implements ICredentialTokenController {
  constructor(
    @Inject('ICredentialTokenService')
    private readonly credentialTokenService: ICredentialTokenService,
  ) {}

  @ApiExcludeEndpoint()
  @Get(':token')
  serveCredentialsPage(@Param('token') _token: string, @Res() res: Response): void {
    res.sendFile(join(__dirname, '..', '..', 'public', 'credentials', 'index.html'));
  }

  @ApiOperation({
    summary: 'Obtener credenciales por token de un solo uso',
    description: 'Consume el token atómicamente y devuelve las credenciales. El token queda inválido tras esta llamada.',
  })
  @ApiResponse({ status: 200, type: CredentialDataResponseDto })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 410, description: 'Token ya usado o expirado' })
  @HttpCode(200)
  @Get(':token/data')
  async getCredentialData(@Param('token') token: string): Promise<CredentialDataResponseDto> {
    const result: ConsumeCredentialTokenResultDto =
      await this.credentialTokenService.consume(token);
    return {
      id: result.oauthClientId,
      clientName: result.clientName,
      redirectUris: result.redirectUris,
      plainSecret: result.plainSecret,
    };
  }
}