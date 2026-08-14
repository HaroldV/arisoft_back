import { RegisterSubscriptionPaymentUseCase } from './register-subscription-payment.use-case';
import { PaymentMethodEnum, SubscriptionPaymentStatusEnum } from '../../../domain/entities/subscription-payment-receipt.entity';
import { BadRequestException } from '@nestjs/common';

describe('RegisterSubscriptionPaymentUseCase (TDD First)', () => {
  let useCase: RegisterSubscriptionPaymentUseCase;
  let mockDataSource: any;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn((entity) => Promise.resolve({ id: 'mock-uuid-123', ...entity })),
    };
    mockDataSource = {
      getRepository: jest.fn(() => mockRepository),
    };
    useCase = new RegisterSubscriptionPaymentUseCase(mockDataSource);
  });

  it('should register a valid subscription payment receipt', async () => {
    const dto = {
      tenant_id: 'tenant-123',
      plan_code: 'COMERCIAL_PRO',
      billing_cycle: 'MONTHLY' as const,
      amount_usd: 35.00,
      amount_bcv_bs: 1277.50,
      bcv_rate_used: 36.50,
      payment_method: PaymentMethodEnum.TRANSFER,
      payment_reference: 'REF-987654',
      bank_origin: 'Banesco',
    };

    const result = await useCase.execute(dto);

    expect(result).toBeDefined();
    expect(result.id).toBe('mock-uuid-123');
    expect(result.status).toBe(SubscriptionPaymentStatusEnum.PENDING_APPROVAL);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should reject payment registration with invalid reference or amount', async () => {
    const dto = {
      tenant_id: 'tenant-123',
      plan_code: 'COMERCIAL_PRO',
      billing_cycle: 'MONTHLY' as const,
      amount_usd: 0,
      amount_bcv_bs: 0,
      bcv_rate_used: 36.50,
      payment_method: PaymentMethodEnum.TRANSFER,
      payment_reference: '',
      bank_origin: 'Banesco',
    };

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
  });
});
