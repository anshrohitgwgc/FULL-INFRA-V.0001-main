import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const PHOTOS_QUEUE = 'photos';

// Producer side. Runs in the same process as the API today ("inline" mode,
// Gate 1 §4). Splitting this into a standalone VM103 worker only requires:
//   1. A new bootstrap (app/api/src/worker.ts) that builds a Nest
//      application-context (no HTTP listener) importing just the modules
//      the processor needs (PhotosModule, ConfigModule, TypeOrmModule for
//      Photo/AuditEvent) — no need to duplicate every controller.
//   2. photos.processor.ts moves with it unchanged — it already only talks
//      to Redis (the queue) and Postgres (via TypeORM), not to the HTTP
//      layer, so no code in it needs to change.
//   3. Both processes point at the same REDIS_HOST/PORT and the same queue
//      name ('photos') — BullMQ workers are already safe to run in a
//      separate process/host from the producer; nothing else changes.
//   4. Remove BullMQRegistration for the queue's *processor* half from
//      app.module.ts (keep the producer registration so the API can still
//      enqueue), and give the new worker.ts its own process manager entry
//      (systemd/pm2) instead of nest start.
@Injectable()
export class PhotosQueueService {
  constructor(@InjectQueue(PHOTOS_QUEUE) private queue: Queue) {}

  enqueuePhotoUploaded(photoId: number) {
    return this.queue.add('photo.uploaded', { photoId }, { removeOnComplete: 100, removeOnFail: 100 });
  }
}
