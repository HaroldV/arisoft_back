import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { RegisterSubscriptionPaymentUseCase } from '../../../application/use-cases/subscription/register-subscription-payment.use-case';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('SubscriptionController (Unit & Integration Tests)', () => {
  let controller: SubscriptionController;
  let mockRegisterPaymentUseCase: any;
  let mockDataSource: any;
  let mockPlanRepository: any;

  const validTenantId = '69430cba-f5b2-4cf2-b7e3-721394c1765c';
  const mockReq = { user: { tenant_id: validTenantId } };

  beforeEach(async () => {
    mockRegisterPaymentUseCase = {
      execute: jest.fn().mockResolvedValue({ id: 'receipt-123', status: 'PENDING_APPROVAL' }),
    };

    mockPlanRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'plan-1', code: 'EMPRENDEDOR', is_active: true }]),
    };

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockPlanRepository),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        { provide: DataSource, useValue: mockDataSource },
        { provide: RegisterSubscriptionPaymentUseCase, useValue: mockRegisterPaymentUseCase },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /subscription/plans', () => {
    it('should return active SaaS plans', async () => {
      const res = await controller.getPlans();
      expect(mockPlanRepository.find).toHaveBeenCalledWith({ where: { is_active: true } });
      expect(res).toEqual([{ id: 'plan-1', code: 'EMPRENDEDOR', is_active: true }]);
    });
  });

  describe('POST /subscription/payments', () => {
    it('should register subscription payment receipt', async () => {
      const body = {
        plan_code: 'EMPRENDEDOR',
        billing_cycle: 'MONTHLY',
        amount_usd: 15,
        amount_bcv_bs: 550,
        bcv_rate_used: 36.6,
        payment_method: 'TRANSFER',
        payment_reference: '00129845',
        bank_origin: 'Banco de Venezuela',
      };

      const res = await controller.registerPayment(mockReq, body);
      expect(mockRegisterPaymentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: validTenantId,
          plan_code: 'EMPRENDEDOR',
          payment_reference: '00129845',
        })
      );
      expect(res).toEqual({ id: 'receipt-123', status: 'PENDING_APPROVAL' });
    });

    it('should throw BadRequestException if user has no tenant_id', async () => {
      const reqNoTenant = { user: {} };
      await expect(controller.registerPayment(reqNoTenant, {})).rejects.toThrow(BadRequestException);
    });
  });
});
