import { Test, TestingModule } from '@nestjs/testing';
import { AccountsController } from './accounts.controller';
import { AccountReceivableRepository } from '../../../infrastructure/persistence/typeorm/repositories/account-receivable.repository';
import { AccountPayableRepository } from '../../../infrastructure/persistence/typeorm/repositories/account-payable.repository';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('AccountsController (Unit & Integration Tests)', () => {
  let controller: AccountsController;
  let mockReceivableRepo: any;
  let mockPayableRepo: any;

  const validTenantId = '69430cba-f5b2-4cf2-b7e3-721394c1765c';
  const mockReq = { user: { tenant_id: validTenantId, full_name: 'Test User' } };

  beforeEach(async () => {
    mockReceivableRepo = {
      findAccountsByTenant: jest.fn().mockResolvedValue([{ id: 'r-1', client_name: 'Cliente A' }]),
      calculateSummaryKPIs: jest.fn().mockResolvedValue({ totalDebtUSD: 100 }),
      save: jest.fn((item) => Promise.resolve({ id: 'r-new', ...item })),
      findByIdAndTenant: jest.fn().mockResolvedValue({ id: 'r-1', total_debt_usd: 100, total_paid_usd: 0, status: 'PENDING' }),
    };

    mockPayableRepo = {
      findAccountsByTenant: jest.fn().mockResolvedValue([{ id: 'p-1', provider_name: 'Proveedor B' }]),
      calculateSummaryKPIs: jest.fn().mockResolvedValue({ totalDebtUSD: 200 }),
      save: jest.fn((item) => Promise.resolve({ id: 'p-new', ...item })),
      findByIdAndTenant: jest.fn().mockResolvedValue({ id: 'p-1', total_debt_usd: 200, total_paid_usd: 0, status: 'PENDING' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        { provide: AccountReceivableRepository, useValue: mockReceivableRepo },
        { provide: AccountPayableRepository, useValue: mockPayableRepo },
      ],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Validation & Security Guards', () => {
    it('should throw BadRequestException if tenantId is invalid UUID', async () => {
      await expect(controller.getReceivables('invalid-uuid', '', mockReq)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if tenantId does not match session', async () => {
      const otherTenant = 'e89b2b51-7f93-41c6-932d-9610f44101e4';
      await expect(controller.getReceivables(otherTenant, '', mockReq)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('GET /accounts/receivables', () => {
    it('should return CxC list and KPIs', async () => {
      const res = await controller.getReceivables(validTenantId, 'search-term', mockReq);
      expect(mockReceivableRepo.findAccountsByTenant).toHaveBeenCalledWith(validTenantId, 'search-term');
      expect(res).toEqual({
        kpis: { totalDebtUSD: 100 },
        items: [{ id: 'r-1', client_name: 'Cliente A' }],
      });
    });
  });

  describe('POST /accounts/receivables', () => {
    it('should create a CxC account record', async () => {
      const dto = {
        entity_name: 'Cliente Test',
        entity_rif: 'J-12345678-9',
        previous_balance: 50,
        period_amount: 50,
      };
      const res = await controller.createReceivable(validTenantId, dto as any, mockReq);
      expect(mockReceivableRepo.save).toHaveBeenCalled();
      expect(res).toHaveProperty('id', 'r-new');
    });
  });

  describe('GET /accounts/payables', () => {
    it('should return CxP list and KPIs', async () => {
      const res = await controller.getPayables(validTenantId, '', mockReq);
      expect(mockPayableRepo.findAccountsByTenant).toHaveBeenCalledWith(validTenantId, '');
      expect(res).toEqual({
        kpis: { totalDebtUSD: 200 },
        items: [{ id: 'p-1', provider_name: 'Proveedor B' }],
      });
    });
  });

  describe('POST /accounts/payables', () => {
    it('should create a CxP account record', async () => {
      const dto = {
        entity_name: 'Proveedor Test',
        entity_rif: 'J-98765432-1',
        previous_balance: 100,
        period_amount: 100,
      };
      const res = await controller.createPayable(validTenantId, dto as any, mockReq);
      expect(mockPayableRepo.save).toHaveBeenCalled();
      expect(res).toHaveProperty('id', 'p-new');
    });
  });

  describe('GET & POST /accounts/receivables-payables (Unified Endpoint)', () => {
    it('should handle unified receivables get', async () => {
      const res = await controller.getAccountsUnified(validTenantId, 'RECEIVABLE', '', mockReq);
      expect(res.items[0]).toHaveProperty('type', 'RECEIVABLE');
    });

    it('should handle unified payables get', async () => {
      const res = await controller.getAccountsUnified(validTenantId, 'PAYABLE', '', mockReq);
      expect(res.items[0]).toHaveProperty('type', 'PAYABLE');
    });

    it('should handle unified creation for payables', async () => {
      const dto = { type: 'PAYABLE', entity_name: 'Prov Unified', period_amount: 100 };
      const res = await controller.createAccountUnified(validTenantId, dto, mockReq);
      expect(res).toHaveProperty('id', 'p-new');
    });
  });
});
