import { GenerateCredentialTokenDto } from '../dtos/generate-credential-token.dto.js';
import { ConsumeCredentialTokenResultDto } from '../dtos/consume-credential-token-result.dto.js';

export interface ICredentialTokenService {
  generate(dto: GenerateCredentialTokenDto): Promise<string>;
  consume(token: string): Promise<ConsumeCredentialTokenResultDto>;
}