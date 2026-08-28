import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('material')
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'recycling' })
  entity: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 'tonne' })
  unit: string;

  @Column({ default: 'simple' })
  capture: string;

  @Column({ type: 'jsonb', nullable: true })
  sizes: string[] | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
