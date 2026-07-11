export class TokenResponseDto {
  readonly access_token!: string;
  readonly refresh_token!: string;
  readonly token_type!: string;
  readonly expires_in!: number;
}