import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum SuspensionSource {
  Admin = 'admin',
  ViolationPolicy = 'violation_policy',
}

/** driver_db.suspensions (docs/data-model.md · 03 driver_db). */
@Entity('suspensions')
export class Suspension {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'enum', enum: SuspensionSource })
  source!: SuspensionSource;

  @Column({ name: 'from_ts', type: 'timestamptz' })
  fromTs!: Date;

  @Index()
  @Column({ name: 'to_ts', type: 'timestamptz', nullable: true })
  toTs!: Date | null;

  @Column({ name: 'lifted_by', type: 'uuid', nullable: true })
  liftedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
