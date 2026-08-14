import { Injectable, BadRequestException } from '@nestjs/common';
import { CashShift } from '../../../domain/entities/cash-shift.entity';
import { CashShiftRepository } from '../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { OpenShiftDto } from './dto/open-shift.dto';

@Injectable()
export class OpenShiftUseCase {
  constructor(
    private readonly cashShiftRepo: CashShiftRepository,
  ) {}

  async execute(tenantId: string, userId: string, dto: OpenShiftDto): Promise<CashShift> {
    // 1. Check if cashier already has an active shift
    const activeShift = await this.cashShiftRepo.findActiveShift(userId);
    if (activeShift) {
      throw new BadRequestException('Ya posees un turno de caja activo abierto.');
    }

    // 2. Initialize new shift
    const shift = new CashShift({
      tenant_id: tenantId,
      cashier_id: userId,
      status: 'OPEN',
      opened_at: new Date(),
      opening_balance_usd: dto.openingBalanceUsd ?? 0.00,
      opening_balance_ves: dto.openingBalanceVes ?? 0.00,
      expected_cash_usd: dto.openingBalanceUsd ?? 0.00,
      expected_cash_ves: dto.openingBalanceVes ?? 0.00,
      declared_cash_usd: 0.00,
      declared_cash_ves: 0.00,
      discrepancy_usd: 0.00,
      discrepancy_ves: 0.00,
    });

    return await this.cashShiftRepo.save(shift);
  }
}
