import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inventory_transaction')
export class InventoryTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'recycling' })
  entity: string;

  @Column({ name: 'warehouseId' })
  warehouseId: number;

  @Column({ name: 'materialId' })
  materialId: number;

  @Column({ type: 'varchar' })
  type: 'inbound' | 'outbound' | 'adjustment';

  @Column({ type: 'numeric' })
  qty: string;

  @Column({ name: 'qtyBySize', type: 'jsonb', nullable: true })
  qtyBySize: Record<string, number> | null;

  @Column({ type: 'numeric', nullable: true })
  gross: string | null;

  @Column({ type: 'numeric', nullable: true })
  tare: string | null;

  @Column({ type: 'varchar', nullable: true })
  ref: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'postedBy', type: 'int', nullable: true })
  postedBy: number | null;

  @Column({ name: 'postedAt', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  postedAt: Date;
}
