import { InventoryController } from '../inventory.controller';
import { BulkUploadProductsUseCase } from '../../../../application/use-cases/inventory/bulk-upload-products.use-case';
import { RegisterPurchaseUseCase } from '../../../../application/use-cases/inventory/register-purchase.use-case';
import { UpdateProductUseCase } from '../../../../application/use-cases/inventory/update-product.use-case';
import { DeleteProductUseCase } from '../../../../application/use-cases/inventory/delete-product.use-case';
import { ProductRepository } from '../../../../infrastructure/persistence/postgresql/repositories/product.repository';
import { PurchaseInvoiceRepository } from '../../../../infrastructure/persistence/postgresql/repositories/purchase-invoice.repository';
import { NotFoundException } from '@nestjs/common';

describe('InventoryController', () => {
  let controller: InventoryController;
  let useCase: BulkUploadProductsUseCase;
  let registerPurchaseUseCase: RegisterPurchaseUseCase;
  let updateUseCase: UpdateProductUseCase;
  let deleteUseCase: DeleteProductUseCase;
  let productRepo: jest.Mocked<ProductRepository>;
  let purchaseInvoiceRepo: jest.Mocked<PurchaseInvoiceRepository>;

  beforeEach(() => {
    useCase = { execute: jest.fn() } as any;
    registerPurchaseUseCase = { execute: jest.fn() } as any;
    const registerPurchaseNoteUseCase = { execute: jest.fn() } as any;
    updateUseCase = { execute: jest.fn() } as any;
    deleteUseCase = { execute: jest.fn() } as any;
    productRepo = {
      findProductsWithStock: jest.fn(),
    } as any;
    purchaseInvoiceRepo = {
      findPurchasesWithCreator: jest.fn(),
      findPurchaseDetails: jest.fn(),
    } as any;
    const purchaseFiscalNoteRepo = {
      findNotesList: jest.fn(),
      findNoteDetails: jest.fn(),
    } as any;
    controller = new InventoryController(
      useCase,
      registerPurchaseUseCase,
      registerPurchaseNoteUseCase,
      updateUseCase,
      deleteUseCase,
      productRepo,
      purchaseInvoiceRepo,
      purchaseFiscalNoteRepo
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findProductsWithStock when getting products', async () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        tenant_id: tenantId,
      },
    };

    productRepo.findProductsWithStock.mockResolvedValue([]);

    await controller.getProducts(tenantId, mockRequest as any, 'SKU-123', 'product-name');

    expect(productRepo.findProductsWithStock).toHaveBeenCalledWith({
      sku: 'SKU-123',
      name: 'product-name',
    });
  });

  it('should call findPurchasesWithCreator when getting purchases', async () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        tenant_id: tenantId,
      },
    };

    purchaseInvoiceRepo.findPurchasesWithCreator.mockResolvedValue([]);

    await controller.getPurchases(tenantId, mockRequest as any);

    expect(purchaseInvoiceRepo.findPurchasesWithCreator).toHaveBeenCalled();
  });

  it('should call findPurchaseDetails when getting purchase details', async () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        tenant_id: tenantId,
      },
    };
    const validUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

    purchaseInvoiceRepo.findPurchaseDetails.mockResolvedValue({ id: validUuid } as any);

    const result = await controller.getPurchaseDetails(validUuid, tenantId, mockRequest as any);

    expect(purchaseInvoiceRepo.findPurchaseDetails).toHaveBeenCalledWith(validUuid);
    expect(result).toEqual({ id: validUuid });
  });

  it('should throw NotFoundException when purchase details do not exist', async () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        tenant_id: tenantId,
      },
    };
    const validUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

    purchaseInvoiceRepo.findPurchaseDetails.mockResolvedValue(null);

    await expect(
      controller.getPurchaseDetails(validUuid, tenantId, mockRequest as any)
    ).rejects.toThrow(NotFoundException);
  });

  it('should call execute on use case when creating products', async () => {
    const dto = {
      sku: 'SKU-123',
      name: 'Test Product',
      costUsd: 10,
      priceUsd: 20,
      taxRate: 16,
      initialStock: 100,
    };
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        tenant_id: tenantId,
      },
    };

    await controller.createProduct(tenantId, [dto], mockRequest as any);

    expect(useCase.execute).toHaveBeenCalledWith(tenantId, [dto]);
  });

  it('should call execute on registerPurchaseUseCase when registering purchase', async () => {
    const dto = {
      invoiceNumber: 'INV-123',
      supplierName: 'Supplier X',
      items: [
        { productId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', quantity: 5, unitCostUsd: 10 },
      ],
    };
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        userId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        tenant_id: tenantId,
      },
    };

    await controller.registerPurchase(tenantId, dto, mockRequest as any);

    expect(registerPurchaseUseCase.execute).toHaveBeenCalledWith(
      tenantId,
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      dto,
    );
  });
});
