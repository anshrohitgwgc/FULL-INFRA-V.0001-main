import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Shift } from './entities/shift.entity';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shift]), AuditModule],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TypeOrmModule, TimesheetsService],
})
export class TimesheetsModule {}
