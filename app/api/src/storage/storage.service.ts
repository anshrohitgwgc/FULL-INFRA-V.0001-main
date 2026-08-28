import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Client;
  private bucket: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.configService.get<string>('MINIO_BUCKET_NAME', 'greenwave-photos');
    this.client = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', '127.0.0.1'),
      port: Number(this.configService.get<string>('MINIO_PORT', '9000')),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', ''),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', ''),
    });

    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) await this.client.makeBucket(this.bucket);
  }

  async putObject(objectKey: string, buffer: Buffer, mimeType: string) {
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return { bucket: this.bucket, objectKey };
  }

  // Short-lived, scoped to one object — the presigned URL itself is the
  // access control for this GET, on top of the app-level RBAC/ownership
  // check made before this is ever called.
  async presignedGetUrl(objectKey: string, expirySeconds = 300) {
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }

  async removeObject(objectKey: string) {
    return this.client.removeObject(this.bucket, objectKey);
  }
}
