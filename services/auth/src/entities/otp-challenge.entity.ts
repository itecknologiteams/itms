import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum OtpPurpose {
  Login = 'login',
  Register = 'register',
}

/** auth_db.otp_challenges — a pending OTP verification. Codes are stored hashed. */
@Entity('otp_challenges')
@Index(['phone', 'purpose', 'consumedAt'])
export class OtpChallenge {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column()
  phone!: string;

  @Column({ name: 'code_hash' })
  codeHash!: string;

  @Column({ type: 'enum', enum: OtpPurpose })
  purpose!: OtpPurpose;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
