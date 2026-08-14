import { Injectable } from '@nestjs/common';
import { CashShiftRepository } from '../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';

@Injectable()
export class GetActiveShiftUseCase {
  constructor(
    private readonly cashShiftRepo: CashShiftRepository,
  ) {}

  async execute(userId: string) {
    const active = await this.cashShiftRepo.findActiveShift(userId);
    if (active) {
      return { active: true, shift: active };
    }

    // Suggested opening balance from the last closed shift of this tenant
    const lastClosed = await this.cashShiftRepo.findLastClosedShift();
    return {
      active: false,
      suggestedOpeningUsd: lastClosed ? Number(lastClosed.declared_cash_usd) : 0.00,
      suggestedOpeningVes: lastClosed ? Number(lastClosed.declared_cash_ves) : 0.00,
    };
  }
}
