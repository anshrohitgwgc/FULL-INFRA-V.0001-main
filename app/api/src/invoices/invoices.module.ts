import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice-line.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceLine]), AuditModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [TypeOrmModule, InvoicesService],
})
export class InvoicesModule {}
