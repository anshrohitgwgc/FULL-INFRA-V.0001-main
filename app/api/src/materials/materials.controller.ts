import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('materials')
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(@Query('entity') entity?: string) {
    return this.materialsService.findAll(entity);
  }

  @Roles('manager', 'admin')
  @Post()
  async create(@Body() dto: CreateMaterialDto, @CurrentUser() me: CurrentUserPayload) {
    const material = await this.materialsService.create(dto);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'create-material',
      entityType: 'material',
      entityId: material.id,
    });
    return material;
  }
}
