import { Column, Entity, PrimaryColumn } from 'typeorm';

/** reporting_db.violation_summary — CQRS read model (docs/data-model.md · 11). */
@Entity('violation_summary')
export class ViolationSummary {
  @PrimaryColumn({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @PrimaryColumn({ type: 'date' })
  date!: string;

  @Column({ type: 'int', default: 0 })
  opened!: number;

  @Column({ name: 'auto_closed', type: 'int', default: 0 })
  autoClosed!: number;

  @Column({ type: 'int', default: 0 })
  escalated!: number;

  @Column({ name: 'avg_duration_s', type: 'double precision', default: 0 })
  avgDurationS!: number;
}
