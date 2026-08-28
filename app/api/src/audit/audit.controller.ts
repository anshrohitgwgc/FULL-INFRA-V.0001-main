import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // History screen — managers and administrators only (README table).
  @Roles('manager', 'admin')
  @Get()
  findAll(@Query('warehouseId') warehouseId?: string, @Query('entityType') entityType?: string) {
    return this.auditService.findAll({
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      entityType,
    });
  }
}
