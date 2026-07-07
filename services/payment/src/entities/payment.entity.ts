import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum PaymentMethod {
  Cash = 'cash',
  JazzCash = 'jazzcash',
  Card = 'card',
}

export enum PaymentStatus {
  Initiated = 'initiated',
  PendingGateway = 'pending_gateway',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Refunded = 'refunded',
}

/** payment_db.payments — one row per attempt (docs/data-model.md · 09 payment_db). */
@Entity('payments')
export class Payment {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method!: PaymentMethod;

  @Column({ name: 'amount_paisa', type: 'bigint' })
  amountPaisa!: string;

  @Index()
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.Initiated })
  status!: PaymentStatus;

  @Column({ name: 'attempt_n', type: 'int' })
  attemptN!: number;

  @Index({ unique: true })
  @Column({ name: 'idempotency_key' })
  idempotencyKey!: string;

  @Index({ unique: true, where: '"gateway_txn_ref" IS NOT NULL' })
  @Column({ name: 'gateway_txn_ref', type: 'varchar', nullable: true })
  gatewayTxnRef!: string | null;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'initiated_at', type: 'timestamptz' })
  initiatedAt!: Date;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt!: Date | null;
}
