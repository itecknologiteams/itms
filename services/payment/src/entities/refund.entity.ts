import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum RefundStatus {
  Pending = 'pending',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

/** payment_db.refunds — admin-initiated refunds against a succeeded payment. */
@Entity('refunds')
export class Refund {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  @Column({ name: 'amount_paisa', type: 'bigint' })
  amountPaisa!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ name: 'initiated_by', type: 'uuid' })
  initiatedBy!: string;

  @Column({ name: 'gateway_ref', type: 'varchar', nullable: true })
  gatewayRef!: string | null;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.Pending })
  status!: RefundStatus;

  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at!: Date;
}
