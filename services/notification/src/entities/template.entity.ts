import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum Channel {
  Push = 'push',
  Sms = 'sms',
}

export enum Lang {
  English = 'en',
  Urdu = 'ur',
}

/**
 * notif_db.templates — bilingual, admin-editable, no deploy required
 * (docs/data-model.md · 10 notif_db; docs/specs.md §10).
 */
@Entity('templates')
@Index(['key', 'channel', 'lang'], { unique: true })
export class Template {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  key!: string;

  @Column({ type: 'enum', enum: Channel })
  channel!: Channel;

  @Column({ type: 'enum', enum: Lang })
  lang!: Lang;

  @Column({ type: 'varchar', nullable: true })
  title!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
