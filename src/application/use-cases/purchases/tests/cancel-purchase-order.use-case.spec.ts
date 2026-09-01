import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CancelPurchaseOrderUseCase } from '../cancel-purchase-order.use-case';

describe('CancelPurchaseOrderUseCase TDD Suite', () => {
  let useCase: CancelPurchaseOrderUseCase;
  let orderRepository: any;
  let receptionRepository: any;

  const mockTenantId = 't1-uuid-1111';
  const mockUserId = 'u1-uuid-1111';
  const mockUserName = 'Admin Operator';

  beforeEach(() => {
    orderRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    receptionRepository = {
      find: jest.fn(),
    };

    useCase = new CancelPurchaseOrderUseCase(orderRepository, receptionRepository);
  });

  it('should throw BadRequestException if cancellation reason is less than 5 characters', async () => {
    await expect(
      useCase.execute(mockTenantId, mockUserId, mockUserName, 'oc-1', { reason: 'No' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if order does not exist', async () => {
    orderRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(mockTenantId, mockUserId, mockUserName, 'non-existent-order', {
        reason: 'Proveedor canceló el pedido por falta de stock',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if order has active warehouse receptions', async () => {
    const mockOrder = {
      id: 'oc-1',
      order_number: 'OC-0000000001',
      tenant_id: mockTenantId,
      status: 'SENT',
    };

    orderRepository.findOne.mockResolvedValue(mockOrder);
    receptionRepository.find.mockResolvedValue([{ id: 'rec-1', status: 'RECEIVED' }]);

    await expect(
      useCase.execute(mockTenantId, mockUserId, mockUserName, 'oc-1', {
        reason: 'Proveedor canceló el despacho',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully cancel order with reason and user audit', async () => {
    const mockOrder = {
      id: 'oc-1',
      order_number: 'OC-0000000001',
      tenant_id: mockTenantId,
      status: 'SENT',
    };

    orderRepository.findOne.mockResolvedValue(mockOrder);
    receptionRepository.find.mockResolvedValue([]);
    orderRepository.save.mockImplementation((entity: any) => entity);

    const result = await useCase.execute(mockTenantId, mockUserId, mockUserName, 'oc-1', {
      reason: 'Proveedor no cuenta con disponibilidad del producto',
    });

    expect(result.status).toBe('CANCELLED');
    expect(result.cancellation_reason).toBe('Proveedor no cuenta con disponibilidad del producto');
    expect(result.cancelled_by_user_id).toBe(mockUserId);
    expect(orderRepository.save).toHaveBeenCalled();
  });
});
