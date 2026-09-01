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
      getPendingSummary: jest.fn().mockResolvedValue({ count: 2, total_balance_due: 150.0 }),
      save: jest.fn((item) => Promise.resolve({ id: 'r-new', ...item })),
      findByIdAndTenant: jest.fn().mockResolvedValue({ id: 'r-1', total_debt_usd: 100, total_paid_usd: 0, status: 'PENDING' }),
    };

    mockPayableRepo = {
      findAccountsByTenant: jest.fn().mockResolvedValue([{ id: 'p-1', provider_name: 'Proveedor B' }]),
      calculateSummaryKPIs: jest.fn().mockResolvedValue({ totalDebtUSD: 200 }),
      getPendingSummary: jest.fn().mockResolvedValue({ count: 3, total_balance_due: 350.0 }),
      save: jest.fn((item) => Promise.resolve({ id: 'p-new', ...item })),
      findByIdAndTenant: jest.fn().mockResolvedValue({ id: 'p-1', total_debt_usd: 200, total_paid_usd: 0, status: 'PENDING' }),
      findAccountWithPayments: jest.fn().mockResolvedValue({ id: 'p-1', total_paid: 0, balance_due: 200, status: 'PENDING' }),
      findById: jest.fn().mockResolvedValue({ id: 'p-1', total_paid: 0, balance_due: 200, status: 'PENDING' }),
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

  describe('GET /accounts/badges/summary', () => {
    it('should return pending badges summary for CxC and CxP', async () => {
      const res = await controller.getHeaderBadges(validTenantId, mockReq);
      expect(res).toEqual({
        cxc: { count: 2, total_balance_due: 150.0 },
        cxp: { count: 3, total_balance_due: 350.0 },
      });
      expect(mockReceivableRepo.getPendingSummary).toHaveBeenCalledWith(validTenantId);
      expect(mockPayableRepo.getPendingSummary).toHaveBeenCalledWith(validTenantId);
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

  describe('POST /accounts/receivables/:id/payments', () => {
    it('should successfully register a payment for CxC', async () => {
      const mockReceivable = {
        id: 'r-123',
        tenant_id: validTenantId,
        client_name: 'Cliente ABC',
        total_paid: 0,
        balance_due: 100,
        status: 'PENDING',
      };

      mockReceivableRepo.findAccountWithPayments = jest.fn().mockResolvedValue(mockReceivable);
      mockReceivableRepo.save.mockImplementation((acc: any) => Promise.resolve(acc));

      const payload = {
        payment_method: 'CASH_USD',
        amount: 50,
        exchange_rate: 1,
        reference_number: 'REF-001',
      };

      const res = await controller.registerReceivablePayment(validTenantId, 'r-123', payload, mockReq);
      expect(res.total_paid).toBe(50);
      expect(res.balance_due).toBe(50);
      expect(res.status).toBe('PARTIAL');
      expect(res.payments).toHaveLength(1);
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

  describe('POST /accounts/payables/:id/payments', () => {
    it('should successfully register payment and formalize supplier invoice with user payload', async () => {
      const mockPayable = {
        id: 'f6937abf-a719-4e48-86eb-2c7135b845a0',
        tenant_id: validTenantId,
        provider_name: 'Distribuidora Polar C.A.',
        total_paid: 0,
        balance_due: 5.84,
        status: 'PENDING',
      };

      mockPayableRepo.findAccountWithPayments.mockResolvedValue(mockPayable);
      mockPayableRepo.save.mockImplementation((acc: any) => Promise.resolve(acc));

      const payload = {
        payment_method: 'CASH_USD',
        amount: 5.84,
        exchange_rate: 36.5,
        reference_number: 'N/A',
        supplier_invoice_number: 'FACT-0023',
      };

      const result = await controller.registerPayablePayment(validTenantId, 'f6937abf-a719-4e48-86eb-2c7135b845a0', payload, mockReq);

      expect(result.total_paid).toBe(5.84);
      expect(result.balance_due).toBe(0);
      expect(result.status).toBe('PAID');
      expect(result.supplier_invoice_number).toBe('FACT-0023');
      expect(mockPayableRepo.save).toHaveBeenCalled();
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
