import { CreateAccountUseCase } from '../create-account.use-case';
import { RegisterPaymentUseCase } from '../register-payment.use-case';
import { AccountType, EntityType, AccountStatus } from '../../../../domain/entities/account-receivable-payable.entity';
import { PaymentMethod } from '../../../../domain/entities/account-payment.entity';

describe('Accounts Use Cases', () => {
  let createAccountUseCase: CreateAccountUseCase;
  let registerPaymentUseCase: RegisterPaymentUseCase;
  let mockAccountRepo: any;
  let mockPaymentRepo: any;

  beforeEach(() => {
    mockAccountRepo = {
      save: jest.fn().mockImplementation((acc) => Promise.resolve({ id: 'acc-1', ...acc })),
      findById: jest.fn(),
    };
    mockPaymentRepo = {
      save: jest.fn().mockImplementation((p) => Promise.resolve({ id: 'pay-1', ...p })),
    };

    createAccountUseCase = new CreateAccountUseCase(mockAccountRepo);
    registerPaymentUseCase = new RegisterPaymentUseCase(mockAccountRepo, mockPaymentRepo);
  });

  describe('CreateAccountUseCase', () => {
    it('should create an account and calculate correct balance due and status', async () => {
      const dto = {
        type: AccountType.PAYABLE,
        entity_type: EntityType.PROVIDER,
        entity_name: 'Distribuidora Full Office S.A',
        previous_balance: 444.46,
        period_amount: 3164.32,
        cash_usd: 1844.48,
      };

      const result = await createAccountUseCase.execute('tenant-1', dto as any);

      expect(mockAccountRepo.save).toHaveBeenCalled();
      expect(result.previous_balance).toBe(444.46);
      expect(result.period_amount).toBe(3164.32);
      expect(result.total_paid).toBe(1844.48);
      expect(result.balance_due).toBeCloseTo(1764.30);
      expect(result.status).toBe(AccountStatus.PARTIAL);
    });
  });

  describe('RegisterPaymentUseCase', () => {
    it('should register payment and update account status to PAID when balance is covered', async () => {
      const existingAccount = {
        id: 'acc-1',
        tenant_id: 'tenant-1',
        previous_balance: 100,
        period_amount: 0,
        total_paid: 0,
        balance_due: 100,
        status: AccountStatus.PENDING,
      };

      mockAccountRepo.findById.mockResolvedValue(existingAccount);

      const dto = {
        payment_method: PaymentMethod.CASH_USD,
        amount: 100,
      };

      const result = await registerPaymentUseCase.execute('tenant-1', 'acc-1', dto);

      expect(mockPaymentRepo.save).toHaveBeenCalled();
      expect(result.total_paid).toBe(100);
      expect(result.balance_due).toBe(0);
      expect(result.status).toBe(AccountStatus.PAID);
    });
  });
});
