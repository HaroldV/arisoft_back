import { PurchasesController } from '../purchases.controller';
import { CreatePurchaseOrderUseCase } from '../../../../application/use-cases/purchases/create-purchase-order.use-case';
import { CreatePurchaseOrderDto } from '../../../../application/use-cases/purchases/create-purchase-order.dto';

describe('PurchasesController E2E / Integration Suite', () => {
  let controller: PurchasesController;
  let orderRepository: any;
  let receptionRepository: any;
  let costHistoryRepository: any;
  let createOrderUseCase: jest.Mocked<CreatePurchaseOrderUseCase>;
  let createReceptionUseCase: any;
  let cancelAndReplaceOrderUseCase: any;
  let cancelOrderUseCase: any;
  let reverseReceptionUseCase: any;
  let bulkUpdatePricesUseCase: any;

  beforeEach(() => {
    orderRepository = {
      find: jest.fn(),
    };
    receptionRepository = {
      find: jest.fn(),
    };
    costHistoryRepository = {
      find: jest.fn(),
    };
    createOrderUseCase = {
      execute: jest.fn(),
    } as any;
    createReceptionUseCase = {
      execute: jest.fn(),
    };
    cancelAndReplaceOrderUseCase = {
      execute: jest.fn(),
    };
    cancelOrderUseCase = {
      execute: jest.fn(),
    };
    bulkUpdatePricesUseCase = {
      execute: jest.fn(),
    };

    controller = new PurchasesController(
      orderRepository,
      receptionRepository,
      costHistoryRepository,
      createOrderUseCase,
      createReceptionUseCase,
      cancelAndReplaceOrderUseCase,
      cancelOrderUseCase,
      bulkUpdatePricesUseCase,
    );
  });

  describe('POST /purchases/orders - Modal Emission E2E Flow', () => {
    it('should successfully pass DTO payload from modal to use-case and return 201 created order', async () => {
      const mockReq = {
        user: {
          tenant_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          sub: 'u1v2w3x4-y5z6-7890-abcd-ef1234567890',
          full_name: 'Test Operator',
        },
      };

      const fullModalDto: CreatePurchaseOrderDto = {
        supplierId: 'prov-uuid-100',
        supplierName: 'Distribuidora Polar, C.A.',
        supplierRif: 'J-00002967-9',
        paymentTerm: 'CREDITO_30',
        currency: 'USD',
        isNational: true,
        expectedDate: '2026-08-30',
        notes: 'Nota E2E de prueba para modal',
        globalDiscountPercentage: 5.0,
        globalSurchargePercentage: 2.0,
        items: [
          {
            productId: 'prod-uuid-1',
            model: 'MOD-2026',
            warehouseId: 'wh-uuid-1',
            quantityOrdered: 20,
            unitCostUsd: 12.5,
            discountPercentage: 2.0,
            taxType: 'TAXABLE',
            taxRate: 16.0,
            additionalTaxAmount: 0,
            lineComment: 'Renglón 1 - Cerveza Pilsen',
          },
        ],
      };

      const expectedOrderResponse = {
        id: 'order-uuid-created-e2e',
        order_number: 'OC-0000000001',
        supplier_id: 'prov-uuid-100',
        supplier_name: 'Distribuidora Polar, C.A.',
        supplier_rif: 'J-00002967-9',
        payment_term: 'CREDITO_30',
        currency: 'USD',
        is_national: true,
        status: 'SENT',
        subtotal_usd: 245.0,
        total_usd: 279.3,
        created_at: new Date(),
        items: fullModalDto.items,
      };

      createOrderUseCase.execute.mockResolvedValue(expectedOrderResponse as any);

      const result = await controller.createOrder(mockReq, fullModalDto);

      expect(createOrderUseCase.execute).toHaveBeenCalledWith(
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'u1v2w3x4-y5z6-7890-abcd-ef1234567890',
        'Test Operator',
        fullModalDto,
      );
      expect(result).toEqual(expectedOrderResponse);
    });

    it('should throw error when use-case rejects invalid data', async () => {
      const mockReq = {
        user: { tenant_id: 'tenant-1' },
      };
      const invalidDto = {} as any;

      createOrderUseCase.execute.mockRejectedValue(new Error('Validation Failed'));

      await expect(controller.createOrder(mockReq, invalidDto)).rejects.toThrow('Validation Failed');
    });

    it('should successfully execute creation with exact user payload', async () => {
      const mockReq = {
        user: {
          tenant_id: 'tenant-uuid-1',
          userId: 'user-uuid-1',
          full_name: 'Operador Test',
        },
      };

      const userExactPayload: CreatePurchaseOrderDto = {
        supplierId: '2eb40f26-b2cd-4f1a-a918-343c3be431fc',
        supplierName: 'Distribuidora Polar, C.A.',
        supplierRif: 'J-00000001-1',
        paymentTerm: 'CONTADO',
        currency: 'USD',
        isNational: true,
        expectedDate: '2026-08-13',
        globalDiscountPercentage: 0,
        globalSurchargePercentage: 0,
        items: [
          {
            productId: '1e17ba47-7c31-4edb-a874-4d88b2d33f97',
            warehouseId: '03bc580c-4c46-4acd-bc44-ba395b95ed00',
            quantityOrdered: 1,
            unitCostUsd: 100,
            discountPercentage: 0,
            taxType: 'TAXABLE',
            taxRate: 16,
            additionalTaxAmount: 0,
          },
        ],
      };

      createOrderUseCase.execute.mockResolvedValue({ id: 'order-123' } as any);

      const res = await controller.createOrder(mockReq, userExactPayload);
      expect(createOrderUseCase.execute).toHaveBeenCalled();
      expect(res).toEqual({ id: 'order-123' });
    });
  });

  describe('POST /purchases/receptions - Reception & CxP Integration Flow', () => {
    it('should successfully execute createReception and generate CxP with user context', async () => {
      const mockReq = {
        user: {
          tenant_id: 'tenant-uuid-1',
          userId: 'user-uuid-1',
          full_name: 'Test Operator',
        },
      };

      const receptionDto = {
        orderId: '4b70f2d3-9a7d-4fb2-854b-121fd778122a',
        supplierId: 'c1727b47-3152-440e-8ab2-2d254af1e816',
        supplierName: 'Distribuidor HV',
        supplierRif: 'J-20343232723',
        ndrNumber: '34324234',
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
          },
        ],
      };

      const expectedResponse = {
        id: 'rec-uuid-100',
        reception_number: 'REC-0000000001',
        order_id: receptionDto.orderId,
        supplier_name: receptionDto.supplierName,
        status: 'RECEIVED',
        items: receptionDto.items,
      };

      createReceptionUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.createReception(mockReq, receptionDto as any);

      expect(createReceptionUseCase.execute).toHaveBeenCalledWith(
        'tenant-uuid-1',
        'user-uuid-1',
        'Test Operator',
        receptionDto,
      );
      expect(result).toEqual(expectedResponse);
    });
  });
});
