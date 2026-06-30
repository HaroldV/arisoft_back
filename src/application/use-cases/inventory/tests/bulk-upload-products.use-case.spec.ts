import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BulkUploadProductsUseCase } from '../bulk-upload-products.use-case';
import { ProductRepository } from '../../../../infrastructure/persistence/postgresql/repositories/product.repository';
import { StockMoveRepository } from '../../../../infrastructure/persistence/postgresql/repositories/stock-move.repository';
import { StockMoveType } from '../../../../domain/entities/stock-move.entity';
import { Product } from '../../../../domain/entities/product.entity';

describe('BulkUploadProductsUseCase', () => {
  let useCase: BulkUploadProductsUseCase;
  let productRepo: jest.Mocked<ProductRepository>;
  let stockMoveRepo: jest.Mocked<StockMoveRepository>;
  let mockManager: any;
  let mockDataSource: any;
  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const mockProductRepo = {
      findBySkus: jest.fn(),
      save: jest.fn(),
    };
    const mockStockMoveRepo = {
      save: jest.fn(),
    };

    mockManager = {
      save: jest.fn().mockImplementation(async (entityClass, data) => ({ ...data, id: 'uuid-saved' })),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkUploadProductsUseCase,
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: StockMoveRepository, useValue: mockStockMoveRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    useCase = module.get<BulkUploadProductsUseCase>(BulkUploadProductsUseCase);
    productRepo = module.get(ProductRepository);
    stockMoveRepo = module.get(StockMoveRepository);
  });

  it('should successfully upload products and record initial stock', async () => {
    const products = [
      {
        sku: 'SKU-1',
        name: 'Product 1',
        costUsd: 10,
        priceUsd: 15,
        taxRate: 16,
        initialStock: 50,
      },
    ];

    productRepo.findBySkus.mockResolvedValue([]);

    const result = await useCase.execute(tenantId, products);

    expect(result.success).toHaveLength(1);
    expect(result.success[0].sku).toBe('SKU-1');
    expect(mockManager.save).toHaveBeenCalledTimes(2);
  });

  it('should maintain tenant isolation (AC: #1)', async () => {
    const productsTenantA = [{ sku: 'SKU-A', name: 'Prod A', costUsd: 10, priceUsd: 15, taxRate: 16, initialStock: 10 }];
    const productsTenantB = [{ sku: 'SKU-B', name: 'Prod B', costUsd: 10, priceUsd: 15, taxRate: 16, initialStock: 10 }];

    productRepo.findBySkus.mockResolvedValue([]);

    await useCase.execute('TENANT-A', productsTenantA);
    expect(mockManager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenant_id: 'TENANT-A' })
    );

    await useCase.execute('TENANT-B', productsTenantB);
    expect(mockManager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenant_id: 'TENANT-B' })
    );
  });

  it('should fail if SKU already exists', async () => {
    const products = [
      {
        sku: 'SKU-EXIST',
        name: 'Product X',
        costUsd: 10,
        priceUsd: 15,
        taxRate: 16,
        initialStock: 50,
      },
    ];

    productRepo.findBySkus.mockResolvedValue([new Product({ sku: 'SKU-EXIST' } as any)]);

    const result = await useCase.execute(tenantId, products);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('SKU already exists');
  });
});
