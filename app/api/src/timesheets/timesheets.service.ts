import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';

import { Shift } from './entities/shift.entity';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class TimesheetsService {
  constructor(
    @InjectRepository(Shift)
    private repo: Repository<Shift>,
  ) {}

  async clockIn(staffId: number, warehouseId?: number) {
    try {
      const shift = this.repo.create({ staffId, warehouseId: warehouseId ?? null });
      return await this.repo.save(shift);
    } catch (err) {
      // uq_shift_one_active_per_staff (migration 008) is what actually
      // makes this safe under concurrent clock-ins — this catch only
      // translates the DB's rejection into a clean 409.
      if (err instanceof QueryFailedError && (err as any).code === POSTGRES_UNIQUE_VIOLATION) {
        throw new ConflictException('Already clocked in — clock out first.');
      }
      throw err;
    }
  }

  async clockOut(staffId: number) {
    const active = await this.repo.findOne({ where: { staffId, endAt: IsNull() } });
    if (!active) throw new NotFoundException('No active shift to clock out of.');
    active.endAt = new Date();
    return this.repo.save(active);
  }

  currentShift(staffId: number) {
    return this.repo.findOne({ where: { staffId, endAt: IsNull() } });
  }

  history(staffId: number, limit = 30) {
    return this.repo.find({
      where: { staffId },
      order: { startAt: 'DESC' },
      take: Math.min(limit, 200),
    });
  }

  activeShifts() {
    return this.repo.query('SELECT * FROM v_active_shifts ORDER BY "startAt" DESC');
  }
}
