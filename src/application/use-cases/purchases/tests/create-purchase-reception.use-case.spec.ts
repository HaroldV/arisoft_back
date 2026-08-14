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

    useCase = new CreatePurchaseReceptionUseCase(
      mockReceptionRepo,
      mockOrderRepo,
      mockOrderItemRepo,
      mockProductRepo,
      mockStockMoveRepo,
      mockCostHistoryRepo,
      mockSerialRepo,
      mockPayableRepo,
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
    expect(mockProductRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        current_stock: 20, // 10 original + 10 received
      })
    );
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
  });
});
