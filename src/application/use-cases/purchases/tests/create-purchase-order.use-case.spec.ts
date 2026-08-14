import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreatePurchaseOrderUseCase } from '../create-purchase-order.use-case';
import { PurchaseOrder, PurchaseOrderItem } from '../../../../domain/entities/purchase-order.entity';
import { Provider } from '../../../../domain/entities/provider.entity';
import { CreatePurchaseOrderDto } from '../create-purchase-order.dto';

describe('CreatePurchaseOrderUseCase', () => {
  let useCase: CreatePurchaseOrderUseCase;
  let mockQueryRunner: any;
  let mockDataSource: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';
  const userName = 'Juan Perez';

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((entityClass, data) => ({ ...data })),
        save: jest.fn().mockImplementation(async (entityClass, data) => {
          if (Array.isArray(data)) {
            return data.map((d, i) => ({ ...d, id: `item-id-${i + 1}` }));
          }
          return { ...data, id: 'order-uuid-123' };
        }),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePurchaseOrderUseCase,
        { provide: getRepositoryToken(PurchaseOrder), useValue: {} },
        { provide: getRepositoryToken(PurchaseOrderItem), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    useCase = module.get<CreatePurchaseOrderUseCase>(CreatePurchaseOrderUseCase);
  });

  it('should successfully create a purchase order with items inside transaction', async () => {
    const dto: CreatePurchaseOrderDto = {
      supplierName: 'Distribuidora Polar C.A.',
      supplierRif: 'J-00002967-9',
      paymentTerm: 'CONTADO',
      currency: 'USD',
      items: [
        {
          productId: 'prod-uuid-1',
          quantityOrdered: 10,
          unitCostUsd: 5.5,
          discountPercentage: 0,
          taxRate: 16,
        },
      ],
    };

    const result = await useCase.execute(tenantId, userId, userName, dto);

    expect(mockQueryRunner.connect).toHaveBeenCalled();
    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
    expect(result.order_number).toBe('OC-0000000001');
    expect(result.id).toBe('order-uuid-123');
  });

  it('should rollback transaction if an error occurs during save', async () => {
    mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB Constraint Violation'));

    const dto: CreatePurchaseOrderDto = {
      supplierName: 'Distribuidora Test',
      supplierRif: 'J-12345678-0',
      items: [
        {
          productId: '33333333-3333-3333-3333-333333333333',
          quantityOrdered: 5,
          unitCostUsd: 10,
        },
      ],
    };

    await expect(useCase.execute(tenantId, userId, userName, dto)).rejects.toThrow('DB Constraint Violation');
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should auto-create product transaccionally if productId is a non-UUID custom name string', async () => {
    mockQueryRunner.manager.findOne
      .mockResolvedValueOnce(null) // Provider search
      .mockResolvedValueOnce({ id: userId }) // User search
      .mockResolvedValueOnce(null); // Product search for custom name

    const dto: CreatePurchaseOrderDto = {
      supplierName: 'Distribuidora Nueva C.A.',
      supplierRif: 'J-99999999-9',
      items: [
        {
          productId: 'Producto Personalizado De Prueba',
          quantityOrdered: 2,
          unitCostUsd: 15.0,
        },
      ],
    };

    const result = await useCase.execute(tenantId, userId, userName, dto);

    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(result.id).toBe('order-uuid-123');
  });
});
