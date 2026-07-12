//No se documenta porque es estructura interna. Al consultar /me se muestra UserInfoOauthDto, que es lo importante.
import { UserInfoOauthDto } from './user-info-oauth.dto.js';

export class JwtPayloadDto extends UserInfoOauthDto {
  readonly type!: 'access' | 'refresh';
  readonly iat!: number;
  readonly exp!: number;
}