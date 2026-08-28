import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryTransaction]), AuditModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [TypeOrmModule, InventoryService],
})
export class InventoryModule {}
