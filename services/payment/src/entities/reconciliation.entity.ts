import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export enum ReconciliationGateway {
  JazzCash = 'jazzcash',
  Card = 'card',
}

/** payment_db.reconciliations — daily gateway-vs-ledger reconciliation summary. */
@Entity('reconciliations')
export class Reconciliation {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'enum', enum: ReconciliationGateway })
  gateway!: ReconciliationGateway;

  @Column({ name: 'report_url', type: 'varchar', nullable: true })
  reportUrl!: string | null;

  @Column({ name: 'matched_count', type: 'int', default: 0 })
  matchedCount!: number;

  @Column({ name: 'mismatched_count', type: 'int', default: 0 })
  mismatchedCount!: number;

  @Column({ type: 'varchar', default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
