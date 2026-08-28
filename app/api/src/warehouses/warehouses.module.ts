import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Warehouse } from './entities/warehouse.entity';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse]), AuditModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [TypeOrmModule, WarehousesService],
})
export class WarehousesModule {}
