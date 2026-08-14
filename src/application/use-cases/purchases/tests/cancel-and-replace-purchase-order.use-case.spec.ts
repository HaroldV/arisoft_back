import { CancelAndReplacePurchaseOrderUseCase } from '../cancel-and-replace-purchase-order.use-case';
import { NotFoundException } from '@nestjs/common';

describe('CancelAndReplacePurchaseOrderUseCase', () => {
  let useCase: CancelAndReplacePurchaseOrderUseCase;
  let mockOrderRepo: any;
  let mockItemRepo: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  beforeEach(() => {
    mockOrderRepo = {};
    mockItemRepo = {};

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockImplementation((entityClass, dto) => ({ id: 'new-oc-uuid-1', ...dto })),
        save: jest.fn().mockImplementation((entityClass, dto) => Array.isArray(dto) ? dto.map((d, i) => ({ id: `saved-id-${i}`, ...d })) : ({ id: 'saved-id-1', ...dto })),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    useCase = new CancelAndReplacePurchaseOrderUseCase(
      mockOrderRepo,
      mockItemRepo,
      mockDataSource,
    );
  });

  it('should throw NotFoundException if order to cancel does not exist', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute('tenant-1', 'user-1', 'Juan Pérez', 'non-existent-id', {
        items: [],
      })
    ).rejects.toThrow(NotFoundException);

    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('should cancel existing order and create substitute order with new items', async () => {
    const oldOrder = {
      id: 'oc-old-1',
      tenant_id: 'tenant-1',
      order_number: 'OC-0000000001',
      supplier_id: 'prov-1',
      supplier_name: 'Nestlé Venezuela',
      supplier_rif: 'J-00000004-4',
      payment_term: 'CONTADO',
      currency: 'USD',
      exchange_rate: 1.0,
      is_national: true,
      status: 'APPROVED',
    };

    mockQueryRunner.manager.findOne.mockResolvedValueOnce(oldOrder); // old order lookup
    mockQueryRunner.manager.findOne.mockResolvedValueOnce({ id: 'prod-1', tenant_id: 'tenant-1' }); // product lookup

    const dto = {
      cancellationReason: 'Ajuste de bultos en almacén',
      items: [
        {
          productId: 'prod-1',
          quantityOrdered: 12,
          unitCostUsd: 50,
        },
      ],
    };

    const result = await useCase.execute('tenant-1', 'user-1', 'Juan Pérez', 'oc-old-1', dto);

    expect(oldOrder.status).toBe('CANCELLED');
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(result.status).toBe('SENT');
    expect(result.order_number).toBe('OC-0000000002');
  });
});
