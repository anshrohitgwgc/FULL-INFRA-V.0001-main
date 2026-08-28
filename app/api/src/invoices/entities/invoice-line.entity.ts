import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Invoice } from './invoice.entity';

@Entity('invoice_line')
export class InvoiceLine {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ name: 'lineIndex' })
  lineIndex: number;

  @Column({ type: 'date', nullable: true })
  date: string;

  @Column({ nullable: true })
  service: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'numeric', default: 0 })
  qty: string;

  @Column({ name: 'rateCents', type: 'bigint', default: 0 })
  rateCents: string;

  @Column({ default: false })
  rebate: boolean;

  @Column({ name: 'amountCents', type: 'bigint', default: 0 })
  amountCents: string;
}
