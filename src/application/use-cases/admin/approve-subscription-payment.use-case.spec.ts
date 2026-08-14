import { ApproveSubscriptionPaymentUseCase } from './approve-subscription-payment.use-case';
import { SubscriptionPaymentStatusEnum } from '../../../domain/entities/subscription-payment-receipt.entity';
import { TenantStatusEnum } from '../../../domain/constants/domain.constants';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ApproveSubscriptionPaymentUseCase (TDD First)', () => {
  let useCase: ApproveSubscriptionPaymentUseCase;
  let mockDataSource: any;
  let mockReceiptRepository: any;
  let mockTenantRepository: any;
  let mockUserRepository: any;

  beforeEach(() => {
    mockReceiptRepository = {
      findOne: jest.fn(),
      save: jest.fn((r) => Promise.resolve(r)),
    };
    mockTenantRepository = {
      findOne: jest.fn(),
      save: jest.fn((t) => Promise.resolve(t)),
    };
    mockUserRepository = {
      find: jest.fn(),
      save: jest.fn((u) => Promise.resolve(u)),
    };

    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity.name === 'Tenant') return mockTenantRepository;
        if (entity.name === 'User') return mockUserRepository;
        return mockReceiptRepository;
      }),
    };

    useCase = new ApproveSubscriptionPaymentUseCase(mockDataSource);
  });

  it('should approve payment and activate tenant and owner users', async () => {
    const mockReceipt = {
      id: 'receipt-123',
      tenant_id: 'tenant-456',
      plan_code: 'CORPORATIVO',
      status: SubscriptionPaymentStatusEnum.PENDING_APPROVAL,
    };
    const mockTenant = {
      id: 'tenant-456',
      is_active: false,
      trial_expires_at: new Date(),
      plan_type: 'EMPRENDEDOR',
    };
    const mockOwners = [
      { id: 'user-789', is_active: false, failed_login_attempts: 3 },
    ];

    mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);
    mockTenantRepository.findOne.mockResolvedValue(mockTenant);
    mockUserRepository.find.mockResolvedValue(mockOwners);

    const result = await useCase.execute('receipt-123', 'admin-001');

    expect(result.receipt.status).toBe(SubscriptionPaymentStatusEnum.APPROVED);
    expect(result.tenant.is_active).toBe(true);
    expect(result.tenant.plan_type).toBe('CORPORATIVO');
    expect(mockOwners[0].is_active).toBe(true);
    expect(mockOwners[0].failed_login_attempts).toBe(0);
  });

  it('should throw NotFoundException if receipt or tenant is missing', async () => {
    mockReceiptRepository.findOne.mockResolvedValue(null);

    await expect(useCase.execute('invalid-id', 'admin-001')).rejects.toThrow(NotFoundException);
  });
});
