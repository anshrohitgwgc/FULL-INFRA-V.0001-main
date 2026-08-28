import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditEvent } from './entities/audit-event.entity';

export interface RecordAuditInput {
  actorId: number | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  warehouseId?: number | null;
  detail?: Record<string, unknown> | null;
}

// Never let a password/token/secret through into the append-only log, no
// matter what a caller passes.
const SECRET_KEY_PATTERN = /pass|token|secret|jwt|authorization/i;

function scrub(detail: Record<string, unknown> | null | undefined) {
  if (!detail) return null;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) {
    if (SECRET_KEY_PATTERN.test(k)) continue;
    clean[k] = v;
  }
  return clean;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private auditRepository: Repository<AuditEvent>,
  ) {}

  async record(input: RecordAuditInput) {
    const event = this.auditRepository.create({
      actorId: input.actorId,
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId != null ? String(input.entityId) : null,
      warehouseId: input.warehouseId ?? null,
      detail: scrub(input.detail),
    });
    return this.auditRepository.save(event);
  }

  async findAll(params: { warehouseId?: number; entityType?: string; limit?: number }) {
    const qb = this.auditRepository.createQueryBuilder('a').orderBy('a."createdAt"', 'DESC');
    if (params.warehouseId) qb.andWhere('a."warehouseId" = :w', { w: params.warehouseId });
    if (params.entityType) qb.andWhere('a."entityType" = :e', { e: params.entityType });
    qb.limit(Math.min(params.limit ?? 200, 1000));
    return qb.getMany();
  }
}
