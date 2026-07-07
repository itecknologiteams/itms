import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum SavedMethodType {
  JazzCash = 'jazzcash',
  Card = 'card',
}

/**
 * passenger_db.saved_methods — tokenized payment methods only (docs/data-model.md
 * · 02). No PAN or wallet credentials are ever stored here (docs/security.md §3).
 */
@Entity('saved_methods')
export class SavedMethod {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'passenger_id', type: 'uuid' })
  passengerId!: string;

  @Column({ type: 'enum', enum: SavedMethodType })
  type!: SavedMethodType;

  @Column({ name: 'gateway_token' })
  gatewayToken!: string;

  @Column({ type: 'varchar', nullable: true })
  label!: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
