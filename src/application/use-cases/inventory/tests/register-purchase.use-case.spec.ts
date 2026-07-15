import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RegisterPurchaseUseCase } from '../register-purchase.use-case';
import { PurchaseInvoiceRepository } from '../../../../infrastructure/persistence/postgresql/repositories/purchase-invoice.repository';
import { ProductRepository } from '../../../../infrastructure/persistence/postgresql/repositories/product.repository';
import { PurchaseInvoice } from '../../../../domain/entities/purchase-invoice.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { StockMoveType } from '../../../../domain/entities/stock-move.entity';

describe('RegisterPurchaseUseCase', () => {
  let useCase: RegisterPurchaseUseCase;
  let purchaseInvoiceRepo: jest.Mocked<PurchaseInvoiceRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let mockManager: any;
  let mockDataSource: any;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const userId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const productId1 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const productId2 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

  beforeEach(async () => {
    const mockPurchaseInvoiceRepo = {
      findByInvoiceNumber: jest.fn(),
      save: jest.fn(),
    };
    const mockProductRepo = {
      findByIds: jest.fn(),
      save: jest.fn(),
    };

    mockManager = {
      save: jest.fn().mockImplementation(async (entityClass, data) => ({ ...data, id: 'saved-id' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterPurchaseUseCase,
        { provide: PurchaseInvoiceRepository, useValue: mockPurchaseInvoiceRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    useCase = module.get<RegisterPurchaseUseCase>(RegisterPurchaseUseCase);
    purchaseInvoiceRepo = module.get(PurchaseInvoiceRepository);
    productRepo = module.get(ProductRepository);
  });

  it('should successfully register a purchase invoice, details and stock moves', async () => {
    const dto = {
      invoiceNumber: 'INV-100',
      supplierName: 'Supplier ABC',
      proofFilePath: '/uploads/inv-100.pdf',
      items: [
        { productId: productId1, quantity: 10, unitCostUsd: 15.5 },
        { productId: productId2, quantity: 5, unitCostUsd: 20 },
      ],
    };

    purchaseInvoiceRepo.findByInvoiceNumber.mockResolvedValue(null);
    productRepo.findByIds.mockResolvedValue([
      new Product({ id: productId1 } as any),
      new Product({ id: productId2 } as any),
    ]);
    mockManager.findOne.mockResolvedValue(null);

    const result = await useCase.execute(tenantId, userId, dto);

    expect(result.message).toBe('Purchase registered successfully');
    expect(result.totalAmountUsd).toBe(10 * 15.5 + 5 * 20); // 155 + 100 = 255
    expect(purchaseInvoiceRepo.findByInvoiceNumber).toHaveBeenCalledWith('INV-100', 'Supplier ABC');
    expect(mockManager.save).toHaveBeenCalled();
    expect(mockManager.update).toHaveBeenCalledTimes(2); // 2 products updated with unit cost
  });

  it('should successfully register a purchase invoice with a global discount percentage', async () => {
    const dto = {
      invoiceNumber: 'INV-102-DISC',
      supplierName: 'Supplier XYZ',
      discountPercentage: 10,
      items: [
        { productId: productId1, quantity: 10, unitCostUsd: 15.5 },
        { productId: productId2, quantity: 5, unitCostUsd: 20 },
      ],
    };

    purchaseInvoiceRepo.findByInvoiceNumber.mockResolvedValue(null);
    productRepo.findByIds.mockResolvedValue([
      new Product({ id: productId1 } as any),
      new Product({ id: productId2 } as any),
    ]);
    mockManager.findOne.mockResolvedValue(null);

    const result = await useCase.execute(tenantId, userId, dto);

    expect(result.message).toBe('Purchase registered successfully');
    // subtotal = 10 * 15.5 + 5 * 20 = 255. discount = 25.5. total = 229.5
    expect(result.totalAmountUsd).toBe(229.5); 
    expect(mockManager.save).toHaveBeenCalled();
  });

  it('should throw ConflictException if the invoice already exists', async () => {
    const dto = {
      invoiceNumber: 'INV-DUP',
      supplierName: 'Supplier ABC',
      items: [],
    };

    purchaseInvoiceRepo.findByInvoiceNumber.mockResolvedValue(new PurchaseInvoice({ id: 'existing-id' } as any));

    await expect(useCase.execute(tenantId, userId, dto)).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException if any productId is invalid', async () => {
    const dto = {
      invoiceNumber: 'INV-101',
      supplierName: 'Supplier ABC',
      items: [
        { productId: productId1, quantity: 10, unitCostUsd: 15.5 },
        { productId: productId2, quantity: 5, unitCostUsd: 20 },
      ],
    };

    purchaseInvoiceRepo.findByInvoiceNumber.mockResolvedValue(null);
    productRepo.findByIds.mockResolvedValue([
      new Product({ id: productId1 } as any),
      // productId2 is missing!
    ]);

    await expect(useCase.execute(tenantId, userId, dto)).rejects.toThrow(NotFoundException);
  });

  it('should update existing StockBalance and resolve default location when locationId is omitted', async () => {
    const dto = {
      invoiceNumber: 'INV-103-WMS',
      supplierName: 'Supplier WMS',
      items: [
        { productId: productId1, quantity: 15, unitCostUsd: 10 },
      ],
    };

    purchaseInvoiceRepo.findByInvoiceNumber.mockResolvedValue(null);
    productRepo.findByIds.mockResolvedValue([
      new Product({ id: productId1, has_batch_control: false, is_perishable: false } as any),
    ]);

    const existingBalance = { id: 'balance-id', quantity: 20 };
    mockManager.findOne.mockImplementation(async (entityClass, options) => {
      if (entityClass.name === 'StockBalance') {
        return existingBalance;
      }
      return null;
    });

    const result = await useCase.execute(tenantId, userId, dto);

    expect(result.message).toBe('Purchase registered successfully');
    expect(mockManager.save).toHaveBeenCalled();
    expect(existingBalance.quantity).toBe(35); // 20 + 15
  });
});
