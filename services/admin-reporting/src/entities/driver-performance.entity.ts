import { Column, Entity, PrimaryColumn } from 'typeorm';

/** reporting_db.driver_performance — CQRS read model (docs/data-model.md · 11). */
@Entity('driver_performance')
export class DriverPerformance {
  @PrimaryColumn({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @PrimaryColumn({ type: 'date' })
  date!: string;

  @Column({ type: 'int', default: 0 })
  rides!: number;

  @Column({ name: 'online_hours', type: 'double precision', default: 0 })
  onlineHours!: number;

  @Column({ name: 'earnings_paisa', type: 'bigint', default: 0 })
  earningsPaisa!: string;

  @Column({ name: 'rating_avg', type: 'double precision', default: 0 })
  ratingAvg!: number;

  @Column({ type: 'int', default: 0 })
  violations!: number;
}
