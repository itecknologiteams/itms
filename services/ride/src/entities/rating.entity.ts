import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** ride_db.ratings — passenger→driver rating for a completed ride (docs/specs.md P-13). */
@Entity('ratings')
export class Rating {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Column({ name: 'passenger_id', type: 'uuid' })
  passengerId!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ type: 'smallint' })
  stars!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
