import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Photo } from './entities/photo.entity';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { PhotosQueueService, PHOTOS_QUEUE } from './photos-queue.service';
import { PhotosProcessor } from './photos.processor';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo]),
    AuditModule,
    StorageModule,
    BullModule.registerQueueAsync({
      name: PHOTOS_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: Number(config.get<string>('REDIS_PORT')),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
  ],
  controllers: [PhotosController],
  providers: [PhotosService, PhotosQueueService, PhotosProcessor],
  exports: [PhotosService],
})
export class PhotosModule {}
