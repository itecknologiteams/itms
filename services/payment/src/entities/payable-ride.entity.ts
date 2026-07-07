import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * payment_db.payable_rides — a small local cache of "ride is now payable, for
 * this amount", populated from `fare.calculated` (docs/architecture.md §3.2:
 * database-per-service — Payment does not read Fare's DB directly). Lets the
 * pay endpoint validate the amount without a synchronous call to Fare.
 */
@Entity('payable_rides')
export class PayableRide {
  @PrimaryColumn('uuid', { name: 'ride_id' })
  rideId!: string;

  @Column({ name: 'amount_paisa', type: 'bigint' })
  amountPaisa!: string;

  @Column({ name: 'fare_config_version', type: 'int' })
  fareConfigVersion!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
