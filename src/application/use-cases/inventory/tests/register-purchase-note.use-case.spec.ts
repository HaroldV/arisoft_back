import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RegisterPurchaseNoteUseCase, RegisterPurchaseNoteDto } from '../register-purchase-note.use-case';
import { PurchaseFiscalNoteRepository } from '../../../../infrastructure/persistence/typeorm/repositories/purchase-fiscal-note.repository';
import { ProductRepository } from '../../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { PurchaseInvoice } from '../../../../domain/entities/purchase-invoice.entity';
import { PurchaseItem } from '../../../../domain/entities/purchase-item.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { WarehouseLocation } from '../../../../domain/entities/warehouse-location.entity';

describe('RegisterPurchaseNoteUseCase', () => {
  let useCase: RegisterPurchaseNoteUseCase;
  let purchaseFiscalNoteRepo: jest.Mocked<PurchaseFiscalNoteRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let mockManager: any;
  let mockDataSource: any;

  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const ipAddress = '127.0.0.1';

  beforeEach(async () => {
    const mockPurchaseFiscalNoteRepo = {
      save: jest.fn(),
    };
    const mockProductRepo = {
      findByIds: jest.fn(),
    };

    mockManager = {
      findOne: jest.fn().mockImplementation(async (entityClass, conditions) => {
        if (entityClass === PurchaseInvoice) {
          return { id: 'invoice-123', tenant_id: tenantId };
        }
        if (entityClass === WarehouseLocation) {
          return { id: 'loc-123', tenant_id: tenantId };
        }
        return null;
      }),
      find: jest.fn().mockImplementation(async (entityClass, conditions) => {
        if (entityClass === PurchaseItem) {
          return [
            { id: 'item-1', purchase_id: 'invoice-123', product_id: 'prod-1', quantity: 10, price_at_time_usd: 80 },
          ];
        }
        return [];
      }),
      save: jest.fn().mockImplementation(async (entityClass, data) => ({ ...data, id: 'note-id' })),
    };

    mockDataSource = {
      manager: mockManager,
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterPurchaseNoteUseCase,
        { provide: PurchaseFiscalNoteRepository, useValue: mockPurchaseFiscalNoteRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    useCase = module.get<RegisterPurchaseNoteUseCase>(RegisterPurchaseNoteUseCase);
    purchaseFiscalNoteRepo = module.get(PurchaseFiscalNoteRepository);
    productRepo = module.get(ProductRepository);
  });

  it('should successfully register a provider purchase credit note and adjust inventory', async () => {
    productRepo.findByIds.mockResolvedValue([
      { id: 'prod-1', name: 'Aceite', tax_rate: 16.00, price_usd: 100, cost_usd: 80 } as Product,
    ]);

    const dto: RegisterPurchaseNoteDto = {
      originalInvoiceId: 'invoice-123',
      documentNumber: 'NC-SUP-999',
      controlNumber: 'CTRL-SUP-888',
      type: 'CREDIT',
      reasonCode: 'RETURN',
      reasonDescription: 'Devolución de mercadería dañada al proveedor',
      currency: 'VES',
      exchangeRate: 50.00,
      adjustStock: true,
      locationId: 'loc-123',
      items: [
        { productId: 'prod-1', quantity: 2, description: 'Aceite devuelto', unitPriceUsd: 80 },
      ],
    };

    const result = await useCase.execute(tenantId, userId, ipAddress, dto);

    expect(result).toBeDefined();
    expect(result.documentNumber).toBe('NC-SUP-999');
    expect(mockManager.save).toHaveBeenCalled();
  });

  it('should throw BadRequestException if refund quantity exceeds original purchase quantity', async () => {
    productRepo.findByIds.mockResolvedValue([
      { id: 'prod-1', name: 'Aceite', tax_rate: 16.00, price_usd: 100 } as Product,
    ]);

    const dto: RegisterPurchaseNoteDto = {
      originalInvoiceId: 'invoice-123',
      documentNumber: 'NC-SUP-999',
      controlNumber: 'CTRL-SUP-888',
      type: 'CREDIT',
      reasonCode: 'RETURN',
      currency: 'VES',
      exchangeRate: 50.00,
      items: [
        { productId: 'prod-1', quantity: 12, description: 'Return qty too high', unitPriceUsd: 80 },
      ],
    };

    await expect(useCase.execute(tenantId, userId, ipAddress, dto)).rejects.toThrow(
      BadRequestException
    );
  });
});
