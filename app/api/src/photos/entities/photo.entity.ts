import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Maps onto the pre-existing `photo` table (migration 003), extended by
// migration 007 with warehouseId/entity/caption for Ops (non-pickup)
// uploads. "pickupId" stays null for every row this module creates.
@Entity('photo')
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pickupId', type: 'int', nullable: true })
  pickupId: number | null;

  @Column({ name: 'objectKey' })
  objectKey: string;

  @Column({ name: 'bucketName' })
  bucketName: string;

  @Column({ name: 'originalFilename' })
  originalFilename: string;

  @Column({ name: 'mimeType' })
  mimeType: string;

  @Column({ name: 'sizeBytes', type: 'bigint' })
  sizeBytes: string;

  @Column({ name: 'uploadedBy', type: 'int', nullable: true })
  uploadedBy: number | null;

  @Column({ name: 'warehouseId', type: 'int', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'varchar', nullable: true })
  entity: string | null;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
