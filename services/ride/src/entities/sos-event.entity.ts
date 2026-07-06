import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** ride_db.sos_events — SOS raised during an active ride (docs/specs.md P-15). */
@Entity('sos_events')
export class SosEvent {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Column({ name: 'raised_by', type: 'uuid' })
  raisedBy!: string;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lon!: number;

  @Column({ name: 'handled_by', type: 'uuid', nullable: true })
  handledBy!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at!: Date;
}
