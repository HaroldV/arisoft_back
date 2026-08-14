import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CashShift } from '../../../domain/entities/cash-shift.entity';
import { CashShiftRepository } from '../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class CloseShiftUseCase {
  constructor(
    private readonly cashShiftRepo: CashShiftRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(tenantId: string, userId: string, dto: CloseShiftDto): Promise<CashShift> {
    // 1. Find active shift for the cashier
    const shift = await this.cashShiftRepo.findActiveShift(userId);
    if (!shift) {
      throw new NotFoundException('No tienes ningún turno de caja activo abierto.');
    }

    if (shift.status !== 'OPEN') {
      throw new BadRequestException('El turno de caja no se encuentra abierto.');
    }

    // 2. Calculate expected cash from sales and changes
    const sums = await this.dataSource.createQueryBuilder()
      .select('payment.payment_method', 'method')
      .addSelect('SUM(payment.amount_original)', 'sum')
      .from('sale_payments', 'payment')
      .innerJoin('sales', 'sale', 'sale.id = payment.sale_id')
      .where('sale.shift_id = :shiftId', { shiftId: shift.id })
      .groupBy('payment.payment_method')
      .getRawMany();

    let cashUsdSales = 0.00;
    let cashVesSales = 0.00;
    let changeUsd = 0.00;
    let changeVes = 0.00;

    for (const row of sums) {
      const sumVal = Number(row.sum || 0);
      if (row.method === 'CASH_USD') {
        cashUsdSales += sumVal;
      } else if (row.method === 'CASH_VES') {
        cashVesSales += sumVal;
      } else if (row.method === 'CHANGE_USD') {
        changeUsd += sumVal; // This is a negative value
      } else if (row.method === 'CHANGE_VES') {
        changeVes += sumVal; // This is a negative value
      }
    }

    const openingUsd = Number(shift.opening_balance_usd || 0);
    const openingVes = Number(shift.opening_balance_ves || 0);

    // Expected cash = Opening + Sales Cash + Change (which is negative)
    const expectedUsd = openingUsd + cashUsdSales + changeUsd;
    const expectedVes = openingVes + cashVesSales + changeVes;

    // Discrepancy = Declared - Expected
    const discrepancyUsd = dto.declaredCashUsd - expectedUsd;
    const discrepancyVes = dto.declaredCashVes - expectedVes;

    // 3. Update shift state
    shift.status = 'PENDING_APPROVAL';
    shift.closed_at = new Date();
    shift.declared_cash_usd = dto.declaredCashUsd;
    shift.declared_cash_ves = dto.declaredCashVes;
    shift.expected_cash_usd = expectedUsd;
    shift.expected_cash_ves = expectedVes;
    shift.discrepancy_usd = discrepancyUsd;
    shift.discrepancy_ves = discrepancyVes;

    return await this.cashShiftRepo.save(shift);
  }
}
