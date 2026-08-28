import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('shift')
export class Shift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'staffId' })
  staffId: number;

  @Column({ name: 'warehouseId', type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ name: 'startAt', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startAt: Date;

  @Column({ name: 'endAt', type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @Column({ nullable: true })
  note: string;
}
