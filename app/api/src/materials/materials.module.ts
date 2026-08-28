import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Material } from './entities/material.entity';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Material]), AuditModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [TypeOrmModule, MaterialsService],
})
export class MaterialsModule {}
