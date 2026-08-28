import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  // Staff-account creation is administrator-only — never self-service
  // (see README: "every other account is created by an administrator").
  @Roles('admin')
  @Post()
  async create(@Body() body: any, @CurrentUser() me: CurrentUserPayload) {
    const user = await this.usersService.create(body);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'create-user',
      entityType: 'user',
      entityId: user.id,
      detail: { role: user.role },
    });
    return user;
  }

  // Managers need the roster too — Timeclock's "team hours right now" view
  // (visible to manager+admin) looks up names/roles by id from this list.
  @Roles('admin', 'manager')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  me(@CurrentUser() me: CurrentUserPayload) {
    return this.usersService.findOne(me.id);
  }

  @Roles('admin')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(Number(id));
  }
}
