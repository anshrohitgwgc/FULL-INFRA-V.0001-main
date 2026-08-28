import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { PhotosService } from './photos.service';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 15 * 1024 * 1024;

@Controller('photos')
export class PhotosController {
  constructor(
    private readonly photosService: PhotosService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadPhotoDto,
    @CurrentUser() me: CurrentUserPayload,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG or WebP images are accepted');
    }
    if (file.size > MAX_BYTES) throw new BadRequestException('File too large');

    const photo = await this.photosService.upload(file, {
      uploadedBy: me.id,
      warehouseId: dto.warehouseId ? Number(dto.warehouseId) : undefined,
      entity: dto.entity,
      caption: dto.caption,
    });

    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'upload-photo',
      entityType: 'photo',
      entityId: photo.id,
      warehouseId: photo.warehouseId,
      detail: { mimeType: photo.mimeType, sizeBytes: photo.sizeBytes },
    });

    return photo;
  }

  @Get()
  findAll(@Query('warehouseId') warehouseId: string | undefined, @CurrentUser() me: CurrentUserPayload) {
    return this.photosService.findAll(
      { warehouseId: warehouseId ? Number(warehouseId) : undefined },
      me,
    );
  }

  @Get(':id/url')
  async url(@Param('id') id: string, @CurrentUser() me: CurrentUserPayload) {
    const url = await this.photosService.presignedUrlFor(Number(id), me);
    return { url };
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() me: CurrentUserPayload) {
    return this.photosService.remove(Number(id), me);
  }
}
