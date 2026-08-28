import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Photo } from './entities/photo.entity';
import { StorageService } from '../storage/storage.service';
import { PhotosQueueService } from './photos-queue.service';

export interface CurrentUserLike {
  id: number;
  role: string;
}

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private repo: Repository<Photo>,
    private storage: StorageService,
    private queue: PhotosQueueService,
  ) {}

  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: { uploadedBy: number; warehouseId?: number; entity?: string; caption?: string },
  ) {
    const objectKey = `photos/${meta.uploadedBy}/${Date.now()}-${randomUUID()}-${file.originalname}`;
    const { bucket } = await this.storage.putObject(objectKey, file.buffer, file.mimetype);

    const photo = this.repo.create({
      objectKey,
      bucketName: bucket,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: String(file.size),
      uploadedBy: meta.uploadedBy,
      warehouseId: meta.warehouseId ?? null,
      entity: meta.entity ?? null,
      caption: meta.caption ?? null,
    });
    const saved = await this.repo.save(photo);

    // Inline worker mode (Gate 1 §4): enqueued on BullMQ, processed by the
    // same process. See photos-queue.service.ts for the VM103-split note.
    await this.queue.enqueuePhotoUploaded(saved.id);

    return saved;
  }

  // No RBAC check — for internal (worker/system) use only, never exposed
  // directly through a controller.
  findOneUnchecked(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  findAll(params: { warehouseId?: number }, requester: CurrentUserLike) {
    const qb = this.repo.createQueryBuilder('p').where('p."pickupId" IS NULL');
    if (params.warehouseId) qb.andWhere('p."warehouseId" = :w', { w: params.warehouseId });

    // README: "Staff see their own; managers and administrators see every
    // photo anyone has taken." Enforced here, not just in the UI.
    if (requester.role === 'staff') {
      qb.andWhere('p."uploadedBy" = :u', { u: requester.id });
    }
    qb.orderBy('p."createdAt"', 'DESC');
    return qb.getMany();
  }

  async findOneForRequester(id: number, requester: CurrentUserLike) {
    const photo = await this.repo.findOne({ where: { id } });
    if (!photo) throw new NotFoundException('Photo not found');
    if (requester.role === 'staff' && photo.uploadedBy !== requester.id) {
      // IDOR guard: a staff member cannot fetch another staff member's
      // photo just by incrementing the id in the URL.
      throw new ForbiddenException('Not your photo');
    }
    return photo;
  }

  async presignedUrlFor(id: number, requester: CurrentUserLike) {
    const photo = await this.findOneForRequester(id, requester);
    return this.storage.presignedGetUrl(photo.objectKey);
  }

  async remove(id: number, requester: CurrentUserLike) {
    if (requester.role !== 'admin') throw new ForbiddenException('Administrators only');
    const photo = await this.repo.findOne({ where: { id } });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.storage.removeObject(photo.objectKey);
    await this.repo.remove(photo);
    return { deleted: true };
  }
}
