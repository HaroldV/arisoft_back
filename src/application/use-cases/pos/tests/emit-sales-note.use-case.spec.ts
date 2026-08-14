import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmitSalesNoteUseCase, EmitSalesNoteDto } from '../emit-sales-note.use-case';
import { SalesFiscalNoteRepository } from '../../../../infrastructure/persistence/typeorm/repositories/sales-fiscal-note.repository';
import { TenantFiscalRangeRepository } from '../../../../infrastructure/persistence/typeorm/repositories/tenant-fiscal-range.repository';
import { ProductRepository } from '../../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { Sale } from '../../../../domain/entities/sale.entity';
import { SaleItem } from '../../../../domain/entities/sale-item.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { WarehouseLocation } from '../../../../domain/entities/warehouse-location.entity';

describe('EmitSalesNoteUseCase', () => {
  let useCase: EmitSalesNoteUseCase;
  let salesFiscalNoteRepo: jest.Mocked<SalesFiscalNoteRepository>;
  let tenantFiscalRangeRepo: jest.Mocked<TenantFiscalRangeRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let mockManager: any;
  let mockDataSource: any;

  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const ipAddress = '127.0.0.1';

  beforeEach(async () => {
    const mockSalesFiscalNoteRepo = {
      save: jest.fn(),
    };
    const mockTenantFiscalRangeRepo = {
      getNextRangeNumbers: jest.fn().mockResolvedValue({
        documentNumber: 'NOT-00000001',
        controlNumber: '00-00000001',
      }),
    };
    const mockProductRepo = {
      findByIds: jest.fn(),
    };

    mockManager = {
      findOne: jest.fn().mockImplementation(async (entityClass, conditions) => {
        if (entityClass === Sale) {
          return { id: 'sale-123', tenant_id: tenantId };
        }
        if (entityClass === WarehouseLocation) {
          return { id: 'loc-123', tenant_id: tenantId };
        }
        return null;
      }),
      find: jest.fn().mockImplementation(async (entityClass, conditions) => {
        if (entityClass === SaleItem) {
          return [
            { id: 'item-1', sale_id: 'sale-123', product_id: 'prod-1', quantity: 10, price_at_time_usd: 100 },
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
        EmitSalesNoteUseCase,
        { provide: SalesFiscalNoteRepository, useValue: mockSalesFiscalNoteRepo },
        { provide: TenantFiscalRangeRepository, useValue: mockTenantFiscalRangeRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    useCase = module.get<EmitSalesNoteUseCase>(EmitSalesNoteUseCase);
    salesFiscalNoteRepo = module.get(SalesFiscalNoteRepository);
    tenantFiscalRangeRepo = module.get(TenantFiscalRangeRepository);
    productRepo = module.get(ProductRepository);
  });

  it('should successfully emit a credit note and re-enter inventory', async () => {
    productRepo.findByIds.mockResolvedValue([
      { id: 'prod-1', name: 'Zapatos', tax_rate: 16.00, price_usd: 100 } as Product,
    ]);

    const dto: EmitSalesNoteDto = {
      originalInvoiceId: 'sale-123',
      type: 'CREDIT',
      reasonCode: 'RETURN',
      reasonDescription: 'Devolución de calzado defectuoso',
      currency: 'USD',
      exchangeRate: 50.00,
      reenterStock: true,
      locationId: 'loc-123',
      items: [
        { productId: 'prod-1', quantity: 2, description: 'Calzado devuelto', unitPriceUsd: 100 },
      ],
    };

    const result = await useCase.execute(tenantId, userId, ipAddress, dto);

    expect(result).toBeDefined();
    expect(result.documentNumber).toBe('NOT-00000001');
    expect(result.totalUsd).toBe(232); // 200 + 16% tax
    expect(result.totalVes).toBe(11600); // 232 * 50
    expect(mockManager.save).toHaveBeenCalled();
  });

  it('should throw BadRequestException if refund quantity exceeds original sold quantity', async () => {
    productRepo.findByIds.mockResolvedValue([
      { id: 'prod-1', name: 'Zapatos', tax_rate: 16.00, price_usd: 100 } as Product,
    ]);

    const dto: EmitSalesNoteDto = {
      originalInvoiceId: 'sale-123',
      type: 'CREDIT',
      reasonCode: 'RETURN',
      currency: 'USD',
      exchangeRate: 50.00,
      items: [
        { productId: 'prod-1', quantity: 15, description: 'Return quantity too high', unitPriceUsd: 100 },
      ],
    };

    await expect(useCase.execute(tenantId, userId, ipAddress, dto)).rejects.toThrow(
      BadRequestException
    );
  });
});
