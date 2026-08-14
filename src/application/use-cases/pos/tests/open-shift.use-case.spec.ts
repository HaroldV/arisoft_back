import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OpenShiftUseCase } from '../open-shift.use-case';
import { CashShiftRepository } from '../../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { CashShift } from '../../../../domain/entities/cash-shift.entity';

describe('OpenShiftUseCase', () => {
  let useCase: OpenShiftUseCase;
  let cashShiftRepo: jest.Mocked<CashShiftRepository>;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const cashierId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  beforeEach(async () => {
    const mockCashShiftRepo = {
      findActiveShift: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenShiftUseCase,
        { provide: CashShiftRepository, useValue: mockCashShiftRepo },
      ],
    }).compile();

    useCase = module.get<OpenShiftUseCase>(OpenShiftUseCase);
    cashShiftRepo = module.get(CashShiftRepository);
  });

  it('should successfully open a cash shift if there is no active shift for the cashier', async () => {
    cashShiftRepo.findActiveShift.mockResolvedValue(null);
    cashShiftRepo.save.mockImplementation(async (shift) => ({
      ...shift,
      id: 'saved-shift-id',
    } as any));

    const dto = {
      openingBalanceUsd: 100.00,
      openingBalanceVes: 500.00,
    };

    const result = await useCase.execute(tenantId, cashierId, dto);

    expect(cashShiftRepo.findActiveShift).toHaveBeenCalledWith(cashierId);
    expect(cashShiftRepo.save).toHaveBeenCalled();
    expect(result.id).toBe('saved-shift-id');
    expect(result.opening_balance_usd).toBe(100.00);
    expect(result.opening_balance_ves).toBe(500.00);
    expect(result.expected_cash_usd).toBe(100.00);
    expect(result.expected_cash_ves).toBe(500.00);
    expect(result.status).toBe('OPEN');
  });

  it('should throw BadRequestException if the cashier already has an active shift', async () => {
    const existingActiveShift = new CashShift({
      id: 'existing-active-id',
      status: 'OPEN',
    });
    cashShiftRepo.findActiveShift.mockResolvedValue(existingActiveShift);

    const dto = {
      openingBalanceUsd: 50.00,
    };

    await expect(useCase.execute(tenantId, cashierId, dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(cashShiftRepo.findActiveShift).toHaveBeenCalledWith(cashierId);
    expect(cashShiftRepo.save).not.toHaveBeenCalled();
  });
});
