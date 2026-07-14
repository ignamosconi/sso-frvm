import { Response } from 'express';
import { CredentialDataResponseDto } from '../dtos/credential-data-response.dto.js';

export interface ICredentialTokenController {
  serveCredentialsPage(token: string, res: Response): void;
  getCredentialData(token: string): Promise<CredentialDataResponseDto>;
}