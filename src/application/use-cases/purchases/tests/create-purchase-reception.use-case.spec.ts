import { CreatePurchaseReceptionUseCase } from '../create-purchase-reception.use-case';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CreatePurchaseReceptionUseCase', () => {
  let useCase: CreatePurchaseReceptionUseCase;
  let mockReceptionRepo: any;
  let mockOrderRepo: any;
  let mockOrderItemRepo: any;
  let mockProductRepo: any;
  let mockStockMoveRepo: any;
  let mockCostHistoryRepo: any;
  let mockSerialRepo: any;
  let mockPayableRepo: any;
  let mockTenantRepo: any;
  let mockUserRepo: any;
  let mockWarehouseRepo: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  beforeEach(() => {
    mockReceptionRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(dto => dto),
      save: jest.fn().mockImplementation(dto => ({ id: 'rec-uuid-1', ...dto })),
      manager: {
        save: jest.fn().mockImplementation((entityClass, dto) => ({ id: 'item-uuid-1', ...dto })),
      },
    };

    mockOrderRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(order => order),
    };

    mockOrderItemRepo = {
      save: jest.fn().mockImplementation(item => item),
    };

    mockProductRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'prod-1',
        tenant_id: 'tenant-1',
        name: 'Producto Test',
        current_stock: 10,
        cost_usd: 50.00,
      }),
      save: jest.fn().mockImplementation(prod => prod),
      create: jest.fn().mockImplementation(prod => prod),
    };

    mockStockMoveRepo = {
      save: jest.fn().mockImplementation(sm => sm),
    };

    mockCostHistoryRepo = {
      save: jest.fn().mockImplementation(ch => ch),
    };

    mockSerialRepo = {
      save: jest.fn().mockImplementation(s => s),
    };

    mockPayableRepo = {
      save: jest.fn().mockImplementation(p => p),
    };

    mockTenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' }),
    };

    mockUserRepo = {
      findOne: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000002' }),
    };

    mockWarehouseRepo = {
      findOne: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000003' }),
    };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn().mockImplementation((entityClass, criteria) => {
          if (entityClass?.name === 'User' || entityClass === 'User') {
            return { id: '00000000-0000-0000-0000-000000000002' };
          }
          if (entityClass?.name === 'Tenant' || entityClass === 'Tenant') {
            return { id: '00000000-0000-0000-0000-000000000001' };
          }
          if (entityClass?.name === 'WarehouseLocation' || entityClass === 'WarehouseLocation') {
            return { id: '00000000-0000-0000-0000-000000000003' };
          }
          if (entityClass?.name === 'Product' || entityClass === 'Product') {
            return {
              id: 'prod-1',
              tenant_id: 'tenant-1',
              name: 'Producto Test',
              current_stock: 10,
              cost_usd: 50.00,
            };
          }
          return mockOrderRepo.findOne();
        }),
        find: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((entityClass, dto) => dto),
        save: jest.fn().mockImplementation((entityClassOrDto, maybeDto) => {
          const payload = maybeDto !== undefined ? maybeDto : entityClassOrDto;
          return Array.isArray(payload) ? payload : { id: 'rec-uuid-1', ...payload };
        }),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    useCase = new CreatePurchaseReceptionUseCase(
      mockReceptionRepo,
      mockOrderRepo,
      mockOrderItemRepo,
      mockProductRepo,
      mockStockMoveRepo,
      mockCostHistoryRepo,
      mockSerialRepo,
      mockPayableRepo,
      mockTenantRepo,
      mockUserRepo,
      mockWarehouseRepo,
      mockDataSource,
    );
  });

  it('should throw BadRequestException if orderId is missing', async () => {
    await expect(
      useCase.execute('tenant-1', 'user-1', 'Juan Pérez', {
        items: [{ productId: 'prod-1', quantityReceived: 5, unitCostUsd: 50 }],
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if orderId does not exist in database', async () => {
    mockOrderRepo.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute('tenant-1', 'user-1', 'Juan Pérez', {
        orderId: 'non-existent-order-id',
        items: [{ productId: 'prod-1', quantityReceived: 5, unitCostUsd: 50 }],
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('should successfully create reception inherited from valid Purchase Order', async () => {
    const mockOrder = {
      id: 'order-uuid-100',
      tenant_id: 'tenant-1',
      supplier_id: 'prov-uuid-1',
      supplier_name: 'Distribuidora Polar, C.A.',
      supplier_rif: 'J-00000001-1',
      payment_term: 'CONTADO',
      currency: 'USD',
      exchange_rate: 36.50,
      is_national: true,
      status: 'APPROVED',
      items: [
        {
          id: 'ord-item-1',
          product_id: 'prod-1',
          quantity_ordered: 10,
          quantity_received: 0,
        },
      ],
    };

    mockOrderRepo.findOne.mockResolvedValue(mockOrder);

    const result = await useCase.execute('tenant-1', 'user-1', 'Juan Pérez', {
      orderId: 'order-uuid-100',
      ndrNumber: 'NDR-99881',
      warehouseName: 'Almacén Principal',
      items: [
        {
          productId: 'prod-1',
          quantityReceived: 10,
          unitCostUsd: 50,
        },
      ],
    });

    expect(result.order_id).toBe('order-uuid-100');
    expect(result.supplier_name).toBe('Distribuidora Polar, C.A.');
    expect(result.supplier_rif).toBe('J-00000001-1');
    expect(result.warehouse_name).toBe('Almacén Principal');
    expect(mockOrder.status).toBe('COMPLETED');
    expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        current_stock: 20, // 10 original + 10 received
      })
    );
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should update order status to PARTIALLY_RECEIVED on partial shipment', async () => {
    const mockOrder = {
      id: 'order-uuid-200',
      tenant_id: 'tenant-1',
      supplier_id: 'prov-uuid-1',
      supplier_name: 'Distribuidora Polar, C.A.',
      supplier_rif: 'J-00000001-1',
      payment_term: 'CREDITO_30',
      currency: 'USD',
      exchange_rate: 36.50,
      is_national: true,
      status: 'APPROVED',
      items: [
        {
          id: 'ord-item-1',
          product_id: 'prod-1',
          quantity_ordered: 10,
          quantity_received: 0,
        },
      ],
    };

    mockOrderRepo.findOne.mockResolvedValue(mockOrder);

    await useCase.execute('tenant-1', 'user-1', 'Juan Pérez', {
      orderId: 'order-uuid-200',
      ndrNumber: 'NDR-PARCIAL-1',
      warehouseName: 'Almacén Principal',
      items: [
        {
          productId: 'prod-1',
          quantityReceived: 4, // Partial shipment
          unitCostUsd: 50,
        },
      ],
    });

    expect(mockOrder.status).toBe('PARTIALLY_RECEIVED');
  });

  it('should process user payload with 3 items successfully', async () => {
    const mockOrder = {
      id: '75df10f7-a6ea-482b-9222-67381bc3ee9f',
      tenant_id: 'tenant-1',
      supplier_id: '1a2f0404-fe26-48ad-a1ea-40e02c3bcfdf',
      supplier_name: 'Nestlé Venezuela, S.A.',
      supplier_rif: 'J-00000004-4',
      payment_term: 'CONTADO',
      currency: 'USD',
      exchange_rate: 1.0,
      is_national: true,
      status: 'APPROVED',
      items: [
        { id: 'i1', product_id: '1e17ba47-7c31-4edb-a874-4d88b2d33f97', quantity_ordered: 9, quantity_received: 0 },
        { id: 'i2', product_id: '3b694970-ce51-4069-ae34-bbd4bd805214', quantity_ordered: 10, quantity_received: 0 },
        { id: 'i3', product_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', quantity_ordered: 8, quantity_received: 0 },
      ],
    };

    mockOrderRepo.findOne.mockResolvedValue(mockOrder);

    const userPayload = {
      orderId: '75df10f7-a6ea-482b-9222-67381bc3ee9f',
      supplierId: '1a2f0404-fe26-48ad-a1ea-40e02c3bcfdf',
      supplierName: 'Nestlé Venezuela, S.A.',
      supplierRif: 'J-00000004-4',
      ndrNumber: '44002382',
      warehouseName: 'Almacén Principal',
      paymentTerm: 'CONTADO',
      currency: 'USD',
      isNational: true,
      items: [
        { itemNumber: 1, productId: '1e17ba47-7c31-4edb-a874-4d88b2d33f97', model: '', warehouseId: '03bc580c-4c46-4acd-bc44-ba395b95ed00', quantityReceived: 9, quantityPending: 9, unitCostUsd: 100, discountPercentage: 0, discountAmount: 0, taxRate: 16, additionalTaxAmount: 0, lineComment: '', serials: [] },
        { itemNumber: 2, productId: '3b694970-ce51-4069-ae34-bbd4bd805214', model: '', warehouseId: '03bc580c-4c46-4acd-bc44-ba395b95ed00', quantityReceived: 10, quantityPending: 10, unitCostUsd: 1, discountPercentage: 0, discountAmount: 0, taxRate: 16, additionalTaxAmount: 0, lineComment: 'Pastelitos de Queso', serials: [] },
        { itemNumber: 3, productId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', model: '', warehouseId: '03bc580c-4c46-4acd-bc44-ba395b95ed00', quantityReceived: 8, quantityPending: 8, unitCostUsd: 1.2, discountPercentage: 0, discountAmount: 0, taxRate: 16, additionalTaxAmount: 0, lineComment: 'Harina de Trigo', serials: [] }
      ]
    };

    const res = await useCase.execute('tenant-1', 'user-1', 'Operador', userPayload);
    expect(res.order_id).toBe('75df10f7-a6ea-482b-9222-67381bc3ee9f');
    expect(res.ndr_number).toBe('44002382');
    expect(res.supplier_name).toBe('Nestlé Venezuela, S.A.');

    // Verify AccountPayable (CxP) registration
    expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        provider_name: 'Nestlé Venezuela, S.A.',
        status: 'PENDING',
        period_amount: expect.any(Number),
        balance_due: expect.any(Number),
      })
    );
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should process exact user payload for Polar with landed freight fields successfully', async () => {
    const mockPolarOrder = {
      id: '06c4dff4-d056-4a81-83aa-11d3928714bf',
      tenant_id: 'tenant-1',
      supplier_id: '29b5ac63-d2ac-4c58-bc82-e61fc8475d42',
      supplier_name: 'Distribuidora Polar C.A.',
      supplier_rif: 'J-00041372-9',
      payment_term: 'CONTADO',
      currency: 'USD',
      exchange_rate: 1.0,
      is_national: true,
      status: 'APPROVED',
      items: [
        { id: 'item-1', product_id: 'd6794828-797a-4392-b41f-7d3da4c88df3', quantity_ordered: 1, quantity_received: 0 },
        { id: 'item-2', product_id: '769322d1-fdee-4368-b47b-7918abbf948b', quantity_ordered: 1, quantity_received: 0 },
        { id: 'item-3', product_id: 'ef64bdb7-892e-41a2-a227-c083a5fec9b4', quantity_ordered: 1, quantity_received: 0 },
      ],
    };

    mockOrderRepo.findOne.mockResolvedValue(mockPolarOrder);

    const polarUserPayload = {
      orderId: '06c4dff4-d056-4a81-83aa-11d3928714bf',
      supplierId: '29b5ac63-d2ac-4c58-bc82-e61fc8475d42',
      supplierName: 'Distribuidora Polar C.A.',
      supplierRif: 'J-00041372-9',
      warehouseName: 'Almacén Principal',
      paymentTerm: 'CONTADO',
      currency: 'USD',
      isNational: true,
      items: [
        {
          itemNumber: 1,
          productId: 'd6794828-797a-4392-b41f-7d3da4c88df3',
          model: '',
          warehouseId: '5f0bee8d-5dea-48f8-a1c0-7f135e370037',
          quantityReceived: 1,
          quantityPending: 1,
          unitCostUsd: 1.2321,
          discountPercentage: 0,
          discountAmount: 0,
          taxRate: 16,
          additionalTaxAmount: 0,
          lineComment: '',
          serials: [],
          landedFreightUnit: 0,
          landedCostUsd: 1.2321,
        },
        {
          itemNumber: 2,
          productId: '769322d1-fdee-4368-b47b-7918abbf948b',
          model: '',
          warehouseId: '5f0bee8d-5dea-48f8-a1c0-7f135e370037',
          quantityReceived: 1,
          quantityPending: 1,
          unitCostUsd: 1.5,
          discountPercentage: 0,
          discountAmount: 0,
          taxRate: 16,
          additionalTaxAmount: 0,
          lineComment: 'Salsa de Tomate Ketchup Pampero 397g',
          serials: [],
          landedFreightUnit: 0,
          landedCostUsd: 1.5,
        },
        {
          itemNumber: 3,
          productId: 'ef64bdb7-892e-41a2-a227-c083a5fec9b4',
          model: '',
          warehouseId: '5f0bee8d-5dea-48f8-a1c0-7f135e370037',
          quantityReceived: 1,
          quantityPending: 1,
          unitCostUsd: 2.3,
          discountPercentage: 0,
          discountAmount: 0,
          taxRate: 16,
          additionalTaxAmount: 0,
          lineComment: 'Mayonesa Kraft Real 445g',
          serials: [],
          landedFreightUnit: 0,
          landedCostUsd: 2.3,
        },
      ],
    };

    const res = await useCase.execute('tenant-1', 'user-1', 'Operador', polarUserPayload);
    expect(res.order_id).toBe('06c4dff4-d056-4a81-83aa-11d3928714bf');
    expect(res.supplier_name).toBe('Distribuidora Polar C.A.');
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });
});
