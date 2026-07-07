import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * reporting_db.admin_audit_log — immutable record of every admin mutation
 * (docs/data-model.md · 11; docs/security.md §6). Written via an explicit
 * internal API call from the acting service at the time of the mutation
 * (not inferred from domain events, since not every admin action has a rich
 * enough event payload to reconstruct before/after state) — see README.
 */
@Entity('admin_audit_log')
export class AdminAuditLog {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'admin_id', type: 'uuid' })
  adminId!: string;

  @Column()
  action!: string;

  @Column()
  entity!: string;

  @Index()
  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ type: 'jsonb', nullable: true })
  before!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after!: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  ip!: string | null;

  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at!: Date;
}
