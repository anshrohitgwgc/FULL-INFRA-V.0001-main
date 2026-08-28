import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

// Invoices are manager+ per the README's RBAC table.
@Roles('manager', 'admin')
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(@Query('warehouseId') warehouseId?: string) {
    return this.invoicesService.findAll({
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(Number(id));
  }

  @Post()
  async create(@Body() dto: CreateInvoiceDto, @CurrentUser() me: CurrentUserPayload) {
    const invoice = await this.invoicesService.create(dto, me.id);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'create-invoice',
      entityType: 'invoice',
      entityId: invoice.number,
      warehouseId: invoice.warehouseId,
      detail: { totalCents: invoice.totalCents },
    });
    return invoice;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateInvoiceDto>,
    @CurrentUser() me: CurrentUserPayload,
  ) {
    const invoice = await this.invoicesService.update(Number(id), dto);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'update-invoice',
      entityType: 'invoice',
      entityId: invoice.number,
      warehouseId: invoice.warehouseId,
    });
    return invoice;
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @CurrentUser() me: CurrentUserPayload) {
    const invoice = await this.invoicesService.duplicate(Number(id), me.id);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'duplicate-invoice',
      entityType: 'invoice',
      entityId: invoice.number,
      warehouseId: invoice.warehouseId,
      detail: { duplicatedFrom: id },
    });
    return invoice;
  }
}
