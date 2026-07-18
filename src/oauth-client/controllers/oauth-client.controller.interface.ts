import { CreateOAuthClientDto } from '../dtos/create-oauth-client.dto.js';
import { UpdateOAuthClientDto } from '../dtos/update-oauth-client.dto.js';
import { OAuthClientResponseDto } from '../dtos/oauth-client-response.dto.js';
import { OAuthClientCreatedResponseDto } from '../dtos/oauth-client-created-response.dto.js';
import { OAuthClientInfoDto } from '../dtos/oauth-client-info.dto.js';
import { SendCredentialsEmailDto } from '../dtos/send-credentials-email.dto.js';

export interface IOAuthClientController {
  findAll(): Promise<OAuthClientResponseDto[]>;
  findOne(id: number): Promise<OAuthClientResponseDto>;
  findInfo(id: number): Promise<OAuthClientInfoDto>;
  create(dto: CreateOAuthClientDto): Promise<OAuthClientCreatedResponseDto>;
  update(id: number, dto: UpdateOAuthClientDto): Promise<OAuthClientResponseDto>;
  remove(id: number): Promise<void>;
  regenerateSecret(id: number): Promise<OAuthClientCreatedResponseDto>;
  sendCredentialsByEmail(id: number, dto: SendCredentialsEmailDto): Promise<void>;
  suspend(id: number): Promise<OAuthClientResponseDto>;
  activate(id: number): Promise<OAuthClientResponseDto>;
}