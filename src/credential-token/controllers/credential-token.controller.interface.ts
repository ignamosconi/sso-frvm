import { Response } from 'express';
import { CredentialDataResponseDto } from '../dtos/credential-data-response.dto.js';

export interface ICredentialTokenController {
  serveCredentialsPage(token: string, res: Response): void;
  consumeCredentialData(token: string): Promise<CredentialDataResponseDto>;
}