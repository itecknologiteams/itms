import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export enum BroadcastAudience {
  AllDrivers = 'all_drivers',
  AllPassengers = 'all_passengers',
}

/** notif_db.broadcasts — admin announcement dispatch record (docs/specs.md A-12). */
@Entity('broadcasts')
export class Broadcast {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: BroadcastAudience })
  audience!: BroadcastAudience;

  @Column({ name: 'template_key' })
  templateKey!: string;

  @Column({ name: 'sent_by', type: 'uuid' })
  sentBy!: string;

  @Column({ type: 'int', default: 0 })
  count!: number;

  @CreateDateColumn({ name: 'at', type: 'timestamptz' })
  at!: Date;
}
