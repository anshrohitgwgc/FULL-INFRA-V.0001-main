import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_event')
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actorId', type: 'int', nullable: true })
  actorId: number | null;

  @Column({ name: 'actorName', type: 'varchar', nullable: true })
  actorName: string | null;

  @Column()
  action: string;

  @Column({ name: 'entityType' })
  entityType: string;

  @Column({ name: 'entityId', type: 'varchar', nullable: true })
  entityId: string | null;

  @Column({ name: 'warehouseId', type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  detail: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
