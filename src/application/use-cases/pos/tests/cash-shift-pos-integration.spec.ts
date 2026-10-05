import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OpenShiftUseCase } from '../open-shift.use-case';
import { GetActiveShiftUseCase } from '../get-active-shift.use-case';
import { CloseShiftUseCase } from '../close-shift.use-case';
import { CashShiftRepository } from '../../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { CashShift } from '../../../../domain/entities/cash-shift.entity';
import { CashShiftStatusEnum } from '../../../../domain/constants/domain.constants';
import { DataSource } from 'typeorm';

describe('Cash Shift POS Lifecycle Integration Tests (E2E)', () => {
  let openShiftUseCase: OpenShiftUseCase;
  let getActiveShiftUseCase: GetActiveShiftUseCase;
  let cashShiftRepo: jest.Mocked<CashShiftRepository>;
  let userRepo: any;
  let dataSource: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const cashierId = '00000000-0000-0000-0000-000000000002';
  const branchId = '00000000-0000-0000-0000-000000000003';

  beforeEach(async () => {
    const mockCashShiftRepo = {
      findActiveShift: jest.fn(),
      findLastClosedShift: jest.fn(),
      save: jest.fn().mockImplementation(async (shift) => ({
        id: shift.id || 'generated-shift-id',
        ...shift,
      })),
    };

    userRepo = {
      findById: jest.fn().mockResolvedValue({
        id: cashierId,
        tenant_id: tenantId,
        branch_id: branchId,
        branch: { id: branchId, name: 'Sede Principal' },
      }),
    };

    dataSource = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenShiftUseCase,
        GetActiveShiftUseCase,
        CloseShiftUseCase,
        { provide: CashShiftRepository, useValue: mockCashShiftRepo },
        { provide: 'IUserRepository', useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    openShiftUseCase = module.get<OpenShiftUseCase>(OpenShiftUseCase);
    getActiveShiftUseCase = module.get<GetActiveShiftUseCase>(GetActiveShiftUseCase);
    cashShiftRepo = module.get(CashShiftRepository);
  });

  describe('Apertura de Turno (Open Shift with USD and VES funds)', () => {
    it('should successfully open shift with both USD and VES opening balances', async () => {
      cashShiftRepo.findActiveShift.mockResolvedValue(null);

      const dto = {
        openingBalanceUsd: 50.00,
        openingBalanceVes: 1850.50,
      };

      const result = await openShiftUseCase.execute(tenantId, cashierId, dto);

      expect(cashShiftRepo.findActiveShift).toHaveBeenCalledWith(cashierId, tenantId);
      expect(result.status).toBe(CashShiftStatusEnum.OPEN);
      expect(result.tenant_id).toBe(tenantId);
      expect(result.cashier_id).toBe(cashierId);
      expect(result.branch_id).toBe(branchId);
      expect(result.opening_balance_usd).toBe(50.00);
      expect(result.opening_balance_ves).toBe(1850.50);
      expect(result.expected_cash_usd).toBe(50.00);
      expect(result.expected_cash_ves).toBe(1850.50);
    });

    it('should successfully open shift when user has no assigned branch (global access)', async () => {
      userRepo.findById.mockResolvedValue({
        id: cashierId,
        tenant_id: tenantId,
        branch_id: null,
      });
      cashShiftRepo.findActiveShift.mockResolvedValue(null);

      const dto = {
        openingBalanceUsd: 10.00,
        openingBalanceVes: 0.00,
      };

      const result = await openShiftUseCase.execute(tenantId, cashierId, dto);

      expect(result.branch_id).toBeUndefined();
      expect(result.status).toBe(CashShiftStatusEnum.OPEN);
    });

    it('should prevent opening another shift when cashier already has an active OPEN shift', async () => {
      const activeShift = new CashShift({
        id: 'shift-1',
        tenant_id: tenantId,
        cashier_id: cashierId,
        status: CashShiftStatusEnum.OPEN,
      });
      cashShiftRepo.findActiveShift.mockResolvedValue(activeShift);

      await expect(
        openShiftUseCase.execute(tenantId, cashierId, { openingBalanceUsd: 10 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should suggest opening balance from last closed shift if no active shift exists', async () => {
      cashShiftRepo.findActiveShift.mockResolvedValue(null);
      cashShiftRepo.findLastClosedShift.mockResolvedValue(new CashShift({
        declared_cash_usd: 120.00,
        declared_cash_ves: 4500.00,
      }));

      const activeStatus = await getActiveShiftUseCase.execute(cashierId, tenantId);

      expect(activeStatus.active).toBe(false);
      expect(activeStatus.suggestedOpeningUsd).toBe(120.00);
      expect(activeStatus.suggestedOpeningVes).toBe(4500.00);
    });
  });
});
