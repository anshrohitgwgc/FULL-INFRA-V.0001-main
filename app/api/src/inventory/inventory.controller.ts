import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { InventoryService } from './inventory.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
  ) {}

  // No @Roles(): staff post weigh-ins/stock tickets per the README table.
  @Get('transactions')
  findTransactions(
    @Query('warehouseId') warehouseId?: string,
    @Query('materialId') materialId?: string,
  ) {
    return this.inventoryService.findTransactions({
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      materialId: materialId ? Number(materialId) : undefined,
    });
  }

  @Post('transactions')
  async createTransaction(@Body() dto: CreateTransactionDto, @CurrentUser() me: CurrentUserPayload) {
    const txn = await this.inventoryService.create(dto, me.id);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: `inventory-${dto.type}`,
      entityType: 'inventory_transaction',
      entityId: txn.id,
      warehouseId: dto.warehouseId,
      detail: { materialId: dto.materialId, qty: dto.qty },
    });
    return txn;
  }

  @Get('balances')
  balances(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.balances(warehouseId ? Number(warehouseId) : undefined);
  }
}
