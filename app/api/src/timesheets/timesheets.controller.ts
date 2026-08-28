import { Body, Controller, Get, Post } from '@nestjs/common';

import { TimesheetsService } from './timesheets.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('timesheets')
export class TimesheetsController {
  constructor(
    private readonly timesheetsService: TimesheetsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('clock-in')
  async clockIn(@Body('warehouseId') warehouseId: number | undefined, @CurrentUser() me: CurrentUserPayload) {
    const shift = await this.timesheetsService.clockIn(me.id, warehouseId);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'clock-in',
      entityType: 'shift',
      entityId: shift.id,
      warehouseId: shift.warehouseId,
    });
    return shift;
  }

  @Post('clock-out')
  async clockOut(@CurrentUser() me: CurrentUserPayload) {
    const shift = await this.timesheetsService.clockOut(me.id);
    await this.auditService.record({
      actorId: me.id,
      actorName: me.fullName,
      action: 'clock-out',
      entityType: 'shift',
      entityId: shift.id,
      warehouseId: shift.warehouseId,
    });
    return shift;
  }

  @Get('me/current')
  current(@CurrentUser() me: CurrentUserPayload) {
    return this.timesheetsService.currentShift(me.id);
  }

  @Get('me/history')
  history(@CurrentUser() me: CurrentUserPayload) {
    return this.timesheetsService.history(me.id);
  }
}
