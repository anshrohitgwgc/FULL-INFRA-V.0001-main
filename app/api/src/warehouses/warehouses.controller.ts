import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('warehouses')
export class WarehousesController {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly auditService: AuditService,
  ) {}

  // No @Roles(): any authenticated user can read (staff need this to pick a
  // warehouse when clocking in).
  @Get()
  findAll() {
    return this.warehousesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(Number(id));
  }

  @Roles('admin')
  @Post()
  async create(@Body() dto: CreateWarehouseDto, @CurrentUser() me: CurrentUserPayload) {
    const warehouse = await this.warehousesService.create(dto);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'create-warehouse',
      entityType: 'warehouse',
      entityId: warehouse.id,
      warehouseId: warehouse.id,
    });
    return warehouse;
  }
}
