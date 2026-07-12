import { UserInfoOauthDto } from '../../auth/dtos/user-info-oauth.dto.js';

export interface ICodeService {
  generate(userInfo: UserInfoOauthDto, clientId: number): string;
  consume(code: string): { userInfo: UserInfoOauthDto; clientId: number } | null;
}