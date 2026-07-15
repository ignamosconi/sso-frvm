import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('oauth_clients')
export class OAuthClientEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  clientName!: string;

  @Column('simple-array')
  redirectUris!: string[];

  @Column({ unique: true })
  clientSecret!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}