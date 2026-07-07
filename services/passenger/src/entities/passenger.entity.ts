import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum PassengerStatus {
  Active = 'active',
  Blocked = 'blocked',
}

export enum Language {
  English = 'en',
  Urdu = 'ur',
}

/** passenger_db.passengers (docs/data-model.md · 02 passenger_db). */
@Entity('passengers')
export class Passenger {
  @PrimaryColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'auth_user_id', type: 'uuid' })
  authUserId!: string;

  @Column()
  name!: string;

  @Index({ unique: true })
  @Column()
  phone!: string;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'enum', enum: Language, default: Language.English })
  language!: Language;

  @Index()
  @Column({ type: 'enum', enum: PassengerStatus, default: PassengerStatus.Active })
  status!: PassengerStatus;

  @Column({ name: 'unsettled_ride_id', type: 'uuid', nullable: true })
  unsettledRideId!: string | null;

  @Column({ name: 'rating_avg', type: 'numeric', default: 0 })
  ratingAvg!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
