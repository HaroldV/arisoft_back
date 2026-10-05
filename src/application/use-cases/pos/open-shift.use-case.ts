import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { CashShift } from '../../../domain/entities/cash-shift.entity';
import { CashShiftRepository } from '../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CashShiftStatusEnum } from '../../../domain/constants/domain.constants';

@Injectable()
export class OpenShiftUseCase {
  constructor(
    private readonly cashShiftRepo: CashShiftRepository,
    @Inject('IUserRepository')
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(tenantId: string, userId: string, dto: OpenShiftDto): Promise<CashShift> {
    // 1. Check if cashier already has an active shift in this tenant
    const activeShift = await this.cashShiftRepo.findActiveShift(userId, tenantId);
    if (activeShift) {
      throw new BadRequestException('Ya posees un turno de caja activo abierto.');
    }

    // 2. Fetch cashier profile to resolve branch assignment
    const user = await this.userRepo.findById(userId);

    const openingUsd = Number(dto.openingBalanceUsd || 0.00);
    const openingVes = Number(dto.openingBalanceVes || 0.00);

    // 3. Initialize new shift
    const shift = new CashShift({
      tenant_id: tenantId,
      cashier_id: userId,
      branch_id: user?.branch_id || undefined,
      status: CashShiftStatusEnum.OPEN,
      opened_at: new Date(),
      opening_balance_usd: openingUsd,
      opening_balance_ves: openingVes,
      expected_cash_usd: openingUsd,
      expected_cash_ves: openingVes,
      declared_cash_usd: 0.00,
      declared_cash_ves: 0.00,
      discrepancy_usd: 0.00,
      discrepancy_ves: 0.00,
    });

    return await this.cashShiftRepo.save(shift);
  }
}
