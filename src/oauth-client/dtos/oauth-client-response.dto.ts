export class OAuthClientResponseDto {
  readonly id!: number;
  readonly clientName!: string;
  readonly redirectUri!: string;
  readonly clientSecret!: string;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}