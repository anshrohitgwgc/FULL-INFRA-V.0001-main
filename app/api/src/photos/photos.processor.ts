import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { AuditService } from '../audit/audit.service';
import { PHOTOS_QUEUE } from './photos-queue.service';
import { PhotosService } from './photos.service';

// Consumer side (inline mode: same process as the API for this gate).
// Deliberately talks only to Postgres/Redis, not the HTTP layer, so this
// file moves unchanged into a standalone VM103 worker later.
@Processor(PHOTOS_QUEUE)
export class PhotosProcessor extends WorkerHost {
  constructor(
    private photosService: PhotosService,
    private auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<{ photoId: number }>) {
    if (job.name !== 'photo.uploaded') return;

    const photo = await this.photosService.findOneUnchecked(job.data.photoId);
    if (!photo) return;

    await this.auditService.record({
      actorId: photo.uploadedBy,
      actorName: null,
      action: 'photo-processed',
      entityType: 'photo',
      entityId: photo.id,
      warehouseId: photo.warehouseId,
      detail: { mimeType: photo.mimeType, sizeBytes: photo.sizeBytes, async: true },
    });
  }
}
