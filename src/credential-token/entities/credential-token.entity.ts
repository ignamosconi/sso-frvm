import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('credential_tokens')
export class CredentialTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ unique: true })
  tokenHash!: string;

  @Column()
  oauthClientId!: number;

  // Secret cifrado con AES-256-GCM. Formato: iv:authTag:ciphertext (todo en hex)
  @Column()
  encryptedSecret!: string;

  @Column({ default: '' })
  clientName!: string;

  // Guardado como JSON serializado
  @Column({ type: 'text', default: '[]' })
  redirectUris!: string;

  @Column({ default: false })
  used!: boolean;

  @Column()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}