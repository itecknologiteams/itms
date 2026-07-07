import { Column, Entity, PrimaryColumn } from 'typeorm';

/** reporting_db.payment_mix — CQRS read model (docs/data-model.md · 11). */
@Entity('payment_mix')
export class PaymentMix {
  @PrimaryColumn({ type: 'date' })
  date!: string;

  @PrimaryColumn({ type: 'varchar' })
  method!: string;

  @Column({ type: 'int', default: 0 })
  count!: number;

  @Column({ name: 'amount_paisa', type: 'bigint', default: 0 })
  amountPaisa!: string;
}
