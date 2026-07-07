import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum RoundingRule {
  Nearest10 = 'nearest_10',
  None = 'none',
}

/**
 * fare_db.fare_configs — versioned, never edited in place; a change creates a
 * new version (docs/specs.md §7.2). A ride uses the version active at its
 * START time.
 */
@Entity('fare_configs')
export class FareConfigEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'int' })
  version!: number;

  @Column({ name: 'base_paisa', type: 'bigint' })
  basePaisa!: string;

  @Column({ name: 'per_km_paisa', type: 'bigint' })
  perKmPaisa!: string;

  @Column({ name: 'per_min_paisa', type: 'bigint' })
  perMinPaisa!: string;

  @Column({ name: 'minimum_paisa', type: 'bigint' })
  minimumPaisa!: string;

  @Column({ type: 'enum', enum: RoundingRule, default: RoundingRule.Nearest10 })
  rounding!: RoundingRule;

  @Column({ name: 'night_multiplier', type: 'numeric', nullable: true })
  nightMultiplier!: string | null;

  @Index()
  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
