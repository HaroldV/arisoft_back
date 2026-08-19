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
      findOne: jest.fn().mockResolvedValue(null),
    };
    mockDataSource = {
      getRepository: jest.fn(() => mockRepository),
    };
    useCase = new RegisterSubscriptionPaymentUseCase(mockDataSource);
  });

  it('should register a valid Transfer/PagoMovil subscription payment receipt with mandatory capture', async () => {
    const dto = {
      tenant_id: 'tenant-123',
      plan_code: 'COMERCIAL_PRO',
      billing_cycle: 'MONTHLY' as const,
      amount_usd: 35.00,
      amount_bcv_bs: 1277.50,
      bcv_rate_used: 36.50,
      payment_method: PaymentMethodEnum.TRANSFER,
      payment_reference: 'REF-987654',
      payment_date: '2026-08-18',
      bank_origin: 'Banesco',
      receipt_image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const result = await useCase.execute(dto);

    expect(result).toBeDefined();
    expect(result.id).toBe('mock-uuid-123');
    expect(result.status).toBe(SubscriptionPaymentStatusEnum.PENDING_APPROVAL);
    expect(result.receipt_image_base64).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should register a valid Zelle payment receipt', async () => {
    const dto = {
      tenant_id: 'tenant-123',
      plan_code: 'COMERCIAL_PRO',
      billing_cycle: 'MONTHLY' as const,
      amount_usd: 35.00,
      amount_bcv_bs: 1277.50,
      bcv_rate_used: 36.50,
      payment_method: PaymentMethodEnum.ZELLE,
      payment_reference: 'ZEL-883392',
      payment_date: '2026-08-18',
      zelle_account_owner: 'Carlos Mendoza',
      zelle_email: 'carlos@empresa.com',
      receipt_image_base64: 'data:image/png;base64,sample_capture',
    };

    const result = await useCase.execute(dto);
    expect(result.zelle_account_owner).toBe('Carlos Mendoza');
    expect(result.zelle_email).toBe('carlos@empresa.com');
  });

  it('should register a valid Binance payment receipt', async () => {
    const dto = {
      tenant_id: 'tenant-123',
      plan_code: 'CORPORATIVO',
      billing_cycle: 'ANNUAL' as const,
      amount_usd: 600.00,
      amount_bcv_bs: 0,
      bcv_rate_used: 1.00,
      payment_method: PaymentMethodEnum.BINANCE,
      payment_reference: 'BINANCE-TX-99001',
      payment_date: '2026-08-18',
      binance_id: '88392019',
      binance_email: 'pagos@empresa.com',
      receipt_image_base64: 'data:image/png;base64,sample_capture',
    };

    const result = await useCase.execute(dto);
    expect(result.binance_id).toBe('88392019');
    expect(result.binance_email).toBe('pagos@empresa.com');
  });

  it('should reject payment registration if capture/receipt image is missing', async () => {
    const dto = {
      tenant_id: 'tenant-123',
      plan_code: 'COMERCIAL_PRO',
      billing_cycle: 'MONTHLY' as const,
      amount_usd: 35.00,
      amount_bcv_bs: 1277.50,
      bcv_rate_used: 36.50,
      payment_method: PaymentMethodEnum.TRANSFER,
      payment_reference: 'REF-123456',
      bank_origin: 'Banesco',
      receipt_image_base64: '', // Missing
    };

    await expect(useCase.execute(dto)).rejects.toThrow('El capture o comprobante del pago es estrictamente obligatorio');
  });

  it('should reject payment registration if there is already a PENDING_APPROVAL payment for the tenant', async () => {
    mockRepository.findOne = jest.fn().mockResolvedValue({ id: 'existing-pending-123', status: SubscriptionPaymentStatusEnum.PENDING_APPROVAL });

    const dto = {
      tenant_id: 'tenant-123',
      plan_code: 'COMERCIAL_PRO',
      billing_cycle: 'MONTHLY' as const,
      amount_usd: 35.00,
      amount_bcv_bs: 1277.50,
      bcv_rate_used: 36.50,
      payment_method: PaymentMethodEnum.TRANSFER,
      payment_reference: 'REF-999999',
      bank_origin: 'Banesco',
      receipt_image_base64: 'data:image/png;base64,valid_capture',
    };

    await expect(useCase.execute(dto)).rejects.toThrow(
      'Actualmente tienes un reporte de pago en proceso de verificación por el equipo de ArivSoft. No puedes registrar un nuevo pago hasta que el anterior sea procesado.'
    );
  });
});
