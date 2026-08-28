import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice-line.entity';
import { CreateInvoiceDto, InvoiceLineDto } from './dto/create-invoice.dto';

function lineAmountCents(l: { qty?: number; rateCents?: number; rebate?: boolean }) {
  const a = Math.round((Number(l.qty) || 0) * (Number(l.rateCents) || 0));
  return l.rebate ? -a : a;
}

function totals(lines: InvoiceLineDto[], taxRate: number) {
  const subtotal = lines.reduce((sum, l) => sum + lineAmountCents(l), 0);
  const tax = Math.round(subtotal * (Number(taxRate) || 0));
  return { subtotal, tax, total: subtotal + tax };
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    private dataSource: DataSource,
  ) {}

  findAll(params: { warehouseId?: number }) {
    const qb = this.invoiceRepo.createQueryBuilder('i').leftJoinAndSelect('i.lines', 'l');
    if (params.warehouseId) qb.andWhere('i."warehouseId" = :w', { w: params.warehouseId });
    qb.orderBy('i.id', 'DESC');
    return qb.getMany();
  }

  findOne(id: number) {
    return this.invoiceRepo.findOne({ where: { id } });
  }

  async create(dto: CreateInvoiceDto, createdBy: number) {
    return this.dataSource.transaction(async (manager) => {
      // Atomic, race-free: PostgreSQL guarantees nextval() never returns the
      // same value to two concurrent transactions, with no explicit locking
      // needed on our part. This is what makes 10 concurrent POST /invoices
      // safe.
      const [{ nextval }] = await manager.query<{ nextval: string }[]>(
        "SELECT nextval('invoice_number_seq') AS nextval",
      );

      const t = totals(dto.lines, dto.taxRate ?? 0);

      const invoice = manager.create(Invoice, {
        publicId: undefined, // DB default gen_random_uuid()
        number: String(nextval),
        warehouseId: dto.warehouseId ?? null,
        customerId: dto.customerId ?? null,
        billTo: dto.billTo,
        shipTo: dto.shipTo,
        shipVia: dto.shipVia,
        shipDate: dto.shipDate,
        date: dto.date,
        termsDays: dto.termsDays ?? 15,
        taxLabel: dto.taxLabel,
        taxRate: String(dto.taxRate ?? 0),
        payNote: dto.payNote,
        company: dto.company,
        subtotalCents: String(t.subtotal),
        taxCents: String(t.tax),
        totalCents: String(t.total),
        createdBy,
        lines: dto.lines.map((l, i) =>
          manager.create(InvoiceLine, {
            lineIndex: i,
            date: l.date,
            service: l.service,
            unit: l.unit,
            description: l.description,
            qty: String(l.qty ?? 0),
            rateCents: String(l.rateCents ?? 0),
            rebate: !!l.rebate,
            amountCents: String(lineAmountCents(l)),
          }),
        ),
      });

      return manager.save(Invoice, invoice);
    });
  }

  async update(id: number, dto: Partial<CreateInvoiceDto>) {
    const existing = await this.invoiceRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Invoice not found');

    return this.dataSource.transaction(async (manager) => {
      const lines = dto.lines ?? existing.lines.map((l) => ({
        date: l.date,
        service: l.service,
        unit: l.unit,
        description: l.description,
        qty: Number(l.qty),
        rateCents: Number(l.rateCents),
        rebate: l.rebate,
      }));
      const taxRate = dto.taxRate ?? Number(existing.taxRate);
      const t = totals(lines, taxRate);

      await manager.delete(InvoiceLine, { invoice: { id } });

      Object.assign(existing, {
        warehouseId: dto.warehouseId ?? existing.warehouseId,
        customerId: dto.customerId ?? existing.customerId,
        billTo: dto.billTo ?? existing.billTo,
        shipTo: dto.shipTo ?? existing.shipTo,
        shipVia: dto.shipVia ?? existing.shipVia,
        shipDate: dto.shipDate ?? existing.shipDate,
        date: dto.date ?? existing.date,
        termsDays: dto.termsDays ?? existing.termsDays,
        taxLabel: dto.taxLabel ?? existing.taxLabel,
        taxRate: String(taxRate),
        payNote: dto.payNote ?? existing.payNote,
        company: dto.company ?? existing.company,
        subtotalCents: String(t.subtotal),
        taxCents: String(t.tax),
        totalCents: String(t.total),
        lines: lines.map((l, i) =>
          manager.create(InvoiceLine, {
            lineIndex: i,
            date: l.date,
            service: l.service,
            unit: l.unit,
            description: l.description,
            qty: String(l.qty ?? 0),
            rateCents: String(l.rateCents ?? 0),
            rebate: !!l.rebate,
            amountCents: String(lineAmountCents(l)),
          }),
        ),
      });

      return manager.save(Invoice, existing);
    });
  }

  async duplicate(id: number, createdBy: number) {
    const original = await this.invoiceRepo.findOne({ where: { id } });
    if (!original) throw new NotFoundException('Invoice not found');

    const lines: InvoiceLineDto[] = original.lines.map((l) => ({
      date: l.date,
      service: l.service,
      unit: l.unit,
      description: l.description,
      qty: Number(l.qty),
      rateCents: Number(l.rateCents),
      rebate: l.rebate,
    }));

    return this.create(
      {
        warehouseId: original.warehouseId ?? undefined,
        customerId: original.customerId ?? undefined,
        billTo: original.billTo,
        shipTo: original.shipTo,
        shipVia: original.shipVia,
        shipDate: original.shipDate,
        date: new Date().toISOString().slice(0, 10),
        termsDays: original.termsDays,
        taxLabel: original.taxLabel,
        taxRate: Number(original.taxRate),
        payNote: original.payNote,
        company: original.company,
        lines,
      },
      createdBy,
    );
  }
}
