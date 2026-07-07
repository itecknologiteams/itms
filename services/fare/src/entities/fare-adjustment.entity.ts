import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** fare_db.fare_adjustments — admin dispute resolution on a completed ride (docs/specs.md §7.3). */
@Entity('fare_adjustments')
export class FareAdjustment {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Column({ name: 'old_total_paisa', type: 'bigint' })
  oldTotalPaisa!: string;

  @Column({ name: 'new_total_paisa', type: 'bigint' })
  newTotalPaisa!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ name: 'adjusted_by', type: 'uuid' })
  adjustedBy!: string;

  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at!: Date;
}
