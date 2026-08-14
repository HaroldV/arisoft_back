import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CloseShiftUseCase } from '../close-shift.use-case';
import { CashShiftRepository } from '../../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { CashShift } from '../../../../domain/entities/cash-shift.entity';

describe('CloseShiftUseCase', () => {
  let useCase: CloseShiftUseCase;
  let cashShiftRepo: jest.Mocked<CashShiftRepository>;
  let mockQueryBuilder: any;
  let mockDataSource: any;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const cashierId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  beforeEach(async () => {
    const mockCashShiftRepo = {
      findActiveShift: jest.fn(),
      save: jest.fn(),
    };

    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloseShiftUseCase,
        { provide: CashShiftRepository, useValue: mockCashShiftRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    useCase = module.get<CloseShiftUseCase>(CloseShiftUseCase);
    cashShiftRepo = module.get(CashShiftRepository);
  });

  it('should successfully close an open shift and calculate discrepancy correctly', async () => {
    const activeShift = new CashShift({
      id: 'active-shift-id',
      tenant_id: tenantId,
      cashier_id: cashierId,
      status: 'OPEN',
      opening_balance_usd: 50.00,
      opening_balance_ves: 100.00,
    });

    cashShiftRepo.findActiveShift.mockResolvedValue(activeShift);
    cashShiftRepo.save.mockImplementation(async (shift) => shift);

    // Mock query returns:
    // CASH_USD: 100.00
    // CHANGE_USD: -10.00
    // CASH_VES: 500.00
    // CHANGE_VES: -50.00
    mockQueryBuilder.getRawMany.mockResolvedValue([
      { method: 'CASH_USD', sum: '100.00' },
      { method: 'CHANGE_USD', sum: '-10.00' },
      { method: 'CASH_VES', sum: '500.00' },
      { method: 'CHANGE_VES', sum: '-50.00' },
    ]);

    const dto = {
      declaredCashUsd: 135.00, // Expected: 50 + 100 - 10 = 140. Discrepancy: 135 - 140 = -5.00
      declaredCashVes: 560.00, // Expected: 100 + 500 - 50 = 550. Discrepancy: 560 - 550 = +10.00
    };

    const result = await useCase.execute(tenantId, cashierId, dto);

    expect(cashShiftRepo.findActiveShift).toHaveBeenCalledWith(cashierId);
    expect(cashShiftRepo.save).toHaveBeenCalled();
    expect(result.status).toBe('PENDING_APPROVAL');
    expect(result.expected_cash_usd).toBe(140.00);
    expect(result.expected_cash_ves).toBe(550.00);
    expect(result.declared_cash_usd).toBe(135.00);
    expect(result.declared_cash_ves).toBe(560.00);
    expect(result.discrepancy_usd).toBe(-5.00);
    expect(result.discrepancy_ves).toBe(10.00);
  });

  it('should throw NotFoundException if cashier has no active shift', async () => {
    cashShiftRepo.findActiveShift.mockResolvedValue(null);

    const dto = {
      declaredCashUsd: 100.00,
      declaredCashVes: 0.00,
    };

    await expect(useCase.execute(tenantId, cashierId, dto)).rejects.toThrow(
      NotFoundException,
    );

    expect(cashShiftRepo.save).not.toHaveBeenCalled();
  });
});
