import { Body, Controller, Get, Post } from '@nestjs/common';

import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Roles('manager', 'admin')
  @Post()
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() me: CurrentUserPayload) {
    const customer = await this.customersService.create(dto);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'create-customer',
      entityType: 'customer',
      entityId: customer.id,
    });
    return customer;
  }
}
