import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryTransaction)
    private repo: Repository<InventoryTransaction>,
  ) {}

  findTransactions(params: { warehouseId?: number; materialId?: number }) {
    const qb = this.repo.createQueryBuilder('t').orderBy('t."postedAt"', 'DESC');
    if (params.warehouseId) qb.andWhere('t."warehouseId" = :w', { w: params.warehouseId });
    if (params.materialId) qb.andWhere('t."materialId" = :m', { m: params.materialId });
    return qb.getMany();
  }

  create(dto: CreateTransactionDto, postedBy: number) {
    const txn = this.repo.create({
      entity: dto.entity ?? 'recycling',
      warehouseId: dto.warehouseId,
      materialId: dto.materialId,
      type: dto.type,
      qty: String(dto.qty),
      qtyBySize: dto.qtyBySize ?? null,
      gross: dto.gross != null ? String(dto.gross) : null,
      tare: dto.tare != null ? String(dto.tare) : null,
      ref: dto.ref,
      date: dto.date,
      postedBy,
    });
    return this.repo.save(txn);
  }

  // Reads the v_inventory_balances view (migration 006) — balances are
  // derived, never stored, so this is always consistent with the
  // transaction log by construction.
  async balances(warehouseId?: number) {
    const params: unknown[] = [];
    let where = '';
    if (warehouseId) {
      where = 'WHERE "warehouseId" = $1';
      params.push(warehouseId);
    }
    return this.repo.query(
      `SELECT "warehouseId", "materialId", entity, "materialName", unit, balance
       FROM v_inventory_balances ${where} ORDER BY "materialName"`,
      params,
    );
  }
}
