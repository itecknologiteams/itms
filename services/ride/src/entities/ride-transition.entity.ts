import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { RideStatus } from '../domain/ride-state-machine';

export enum TransitionActor {
  Passenger = 'passenger',
  Driver = 'driver',
  System = 'system',
  Admin = 'admin',
}

/** ride_db.ride_transitions — full actor-attributed audit of state changes (docs/specs.md §3). */
@Entity('ride_transitions')
export class RideTransition {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Column({ name: 'from_status', type: 'varchar', nullable: true })
  fromStatus!: RideStatus | null;

  @Column({ name: 'to_status', type: 'varchar' })
  toStatus!: RideStatus;

  @Column({ type: 'enum', enum: TransitionActor })
  actor!: TransitionActor;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at!: Date;
}
