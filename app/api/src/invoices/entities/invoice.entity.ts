import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { InvoiceLine } from './invoice-line.entity';

@Entity('invoice')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'publicId' })
  publicId: string;

  @Column()
  number: string;

  @Column({ name: 'warehouseId', type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ name: 'customerId', type: 'int', nullable: true })
  customerId: number | null;

  @Column({ name: 'billTo' })
  billTo: string;

  @Column({ name: 'shipTo', nullable: true })
  shipTo: string;

  @Column({ name: 'shipVia', nullable: true })
  shipVia: string;

  @Column({ name: 'shipDate', type: 'date', nullable: true })
  shipDate: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'termsDays', default: 15 })
  termsDays: number;

  @Column({ name: 'taxLabel', nullable: true })
  taxLabel: string;

  @Column({ name: 'taxRate', type: 'numeric', default: 0 })
  taxRate: string;

  @Column({ name: 'payNote', nullable: true })
  payNote: string;

  @Column({ type: 'jsonb' })
  company: Record<string, unknown>;

  @Column({ name: 'subtotalCents', type: 'bigint', default: 0 })
  subtotalCents: string;

  @Column({ name: 'taxCents', type: 'bigint', default: 0 })
  taxCents: string;

  @Column({ name: 'totalCents', type: 'bigint', default: 0 })
  totalCents: string;

  @Column({ name: 'createdBy', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @OneToMany(() => InvoiceLine, (line) => line.invoice, { cascade: true, eager: true })
  lines: InvoiceLine[];
}
