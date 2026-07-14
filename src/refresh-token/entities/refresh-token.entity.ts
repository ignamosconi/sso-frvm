import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  tokenHash!: string;

  @Index()
  @Column('uuid')
  familyId!: string;

  @Index()
  @Column()
  sub!: string;

  // 'student' | 'admin'
  @Column()
  type!: string;

  @Column({ default: false })
  used!: boolean;

  @Column({ default: false })
  revoked!: boolean;

  @Column()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}