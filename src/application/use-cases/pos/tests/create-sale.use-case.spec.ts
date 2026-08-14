import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSaleUseCase } from '../create-sale.use-case';
import { SaleRepository } from '../../../../infrastructure/persistence/typeorm/repositories/sale.repository';
import { ProductRepository } from '../../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { TenantRepository } from '../../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { Product } from '../../../../domain/entities/product.entity';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { StockMoveType } from '../../../../domain/entities/stock-move.entity';
import { TenantFiscalRangeRepository } from '../../../../infrastructure/persistence/typeorm/repositories/tenant-fiscal-range.repository';
import { CashShiftRepository } from '../../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { CashShift } from '../../../../domain/entities/cash-shift.entity';

describe('CreateSaleUseCase', () => {
  let useCase: CreateSaleUseCase;
  let saleRepo: jest.Mocked<SaleRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let stockMoveRepo: jest.Mocked<StockMoveRepository>;
  let tenantRepo: jest.Mocked<TenantRepository>;
  let tenantFiscalRangeRepo: jest.Mocked<TenantFiscalRangeRepository>;
  let mockManager: any;
  let mockDataSource: any;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const userId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const productId1 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const productId2 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

  beforeEach(async () => {
    const mockSaleRepo = {
      save: jest.fn(),
      findById: jest.fn(),
    };
    const mockProductRepo = {
      findByIds: jest.fn(),
    };
    const mockStockMoveRepo = {
      getCurrentStocks: jest.fn(),
      save: jest.fn(),
    };
    const mockTenantRepo = {
      findById: jest.fn(),
    };
    const mockTenantFiscalRangeRepo = {
      getNextRangeNumbers: jest.fn().mockResolvedValue({ documentNumber: 'FACT-00000001', controlNumber: '00-00000001' }),
    };
    const mockCashShiftRepo = {
      findActiveShift: jest.fn().mockResolvedValue(new CashShift({ id: 'active-shift-id', status: 'OPEN' })),
    };

    mockManager = {
      save: jest.fn().mockImplementation(async (entityClass, data) => ({ ...data, id: 'saved-sale-id' })),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSaleUseCase,
        { provide: SaleRepository, useValue: mockSaleRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: StockMoveRepository, useValue: mockStockMoveRepo },
        { provide: TenantRepository, useValue: mockTenantRepo },
        { provide: TenantFiscalRangeRepository, useValue: mockTenantFiscalRangeRepo },
        { provide: CashShiftRepository, useValue: mockCashShiftRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    useCase = module.get<CreateSaleUseCase>(CreateSaleUseCase);
    saleRepo = module.get(SaleRepository);
    productRepo = module.get(ProductRepository);
    stockMoveRepo = module.get(StockMoveRepository);
    tenantRepo = module.get(TenantRepository);
    tenantFiscalRangeRepo = module.get(TenantFiscalRangeRepository);
  });

  it('should successfully register a sale when stock is sufficient', async () => {
    const dto = {
      exchangeRateApplied: 36.5,
      items: [
        { productId: productId1, quantity: 2 },
        { productId: productId2, quantity: 1 },
      ],
    };

    const tenant = Object.assign(new Tenant(), { id: tenantId, settings: { allow_negative_stock: false } });
    tenantRepo.findById.mockResolvedValue(tenant);
    productRepo.findByIds.mockResolvedValue([
      new Product({ id: productId1, price_usd: 10, cost_usd: 8 } as any),
      new Product({ id: productId2, price_usd: 20, cost_usd: 16 } as any),
    ]);

    const stockMap = new Map<string, number>();
    stockMap.set(productId1, 5);
    stockMap.set(productId2, 2);
    stockMoveRepo.getCurrentStocks.mockResolvedValue(stockMap);

    const result = await useCase.execute(tenantId, { id: userId, role: 'CASHIER', permissions: [] }, dto);

    expect(result.message).toBe('Sale registered successfully');
    expect(result.totalAmountUsd).toBe(2 * 10 + 1 * 20); // 40
    expect(mockManager.save).toHaveBeenCalledTimes(6); // 1 Sale + 2 SaleItem + 2 StockMove + 1 SalePayment
  });

  it('should throw BadRequestException if stock is insufficient and allow_negative_stock is false', async () => {
    const dto = {
      items: [{ productId: productId1, quantity: 10 }],
    };

    const tenant = Object.assign(new Tenant(), { id: tenantId, settings: { allow_negative_stock: false } });
    tenantRepo.findById.mockResolvedValue(tenant);
    productRepo.findByIds.mockResolvedValue([new Product({ id: productId1, price_usd: 10, cost_usd: 8 } as any)]);

    const stockMap = new Map<string, number>();
    stockMap.set(productId1, 5); // only 5 available
    stockMoveRepo.getCurrentStocks.mockResolvedValue(stockMap);

    await expect(useCase.execute(tenantId, { id: userId, role: 'CASHIER', permissions: [] }, dto)).rejects.toThrow(BadRequestException);
  });

  it('should successfully sell with negative stock if allow_negative_stock is true and justification is provided', async () => {
    const dto = {
      negativeStockJustification: 'Customer urgent purchase',
      items: [{ productId: productId1, quantity: 10 }],
    };

    const tenant = Object.assign(new Tenant(), { id: tenantId, settings: { allow_negative_stock: true } });
    tenantRepo.findById.mockResolvedValue(tenant);
    productRepo.findByIds.mockResolvedValue([new Product({ id: productId1, price_usd: 10, cost_usd: 8 } as any)]);

    const stockMap = new Map<string, number>();
    stockMap.set(productId1, 2); // only 2 available, remanent is -8
    stockMoveRepo.getCurrentStocks.mockResolvedValue(stockMap);

    const result = await useCase.execute(tenantId, { id: userId, role: 'CASHIER', permissions: [] }, dto);

    expect(result.message).toBe('Sale registered successfully');
    expect(mockManager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: StockMoveType.SALE,
        justification: 'Customer urgent purchase',
      }),
    );
  });

  it('should throw BadRequestException if stock is negative and justification is omitted', async () => {
    const dto = {
      items: [{ productId: productId1, quantity: 10 }], // no justification
    };

    const tenant = Object.assign(new Tenant(), { id: tenantId, settings: { allow_negative_stock: true } });
    tenantRepo.findById.mockResolvedValue(tenant);
    productRepo.findByIds.mockResolvedValue([new Product({ id: productId1, price_usd: 10, cost_usd: 8 } as any)]);

    const stockMap = new Map<string, number>();
    stockMap.set(productId1, 2);
    stockMoveRepo.getCurrentStocks.mockResolvedValue(stockMap);

    await expect(useCase.execute(tenantId, { id: userId, role: 'CASHIER', permissions: [] }, dto)).rejects.toThrow(BadRequestException);
  });

  it('should apply discount successfully if user has permission pos:discount', async () => {
    const dto = {
      discountPercent: 10,
      items: [{ productId: productId1, quantity: 2 }],
    };

    const tenant = Object.assign(new Tenant(), { id: tenantId, settings: { allow_negative_stock: false } });
    tenantRepo.findById.mockResolvedValue(tenant);
    productRepo.findByIds.mockResolvedValue([new Product({ id: productId1, price_usd: 10, cost_usd: 8 } as any)]);

    const stockMap = new Map<string, number>();
    stockMap.set(productId1, 5);
    stockMoveRepo.getCurrentStocks.mockResolvedValue(stockMap);

    const result = await useCase.execute(tenantId, { id: userId, role: 'CASHIER', permissions: ['pos:discount'] }, dto);
    expect(result.totalAmountUsd).toBe(18); // (2 * 10) * 0.9 = 18
  });

  it('should throw BadRequestException if user does not have permission pos:discount', async () => {
    const dto = {
      discountPercent: 10,
      items: [{ productId: productId1, quantity: 2 }],
    };

    await expect(
      useCase.execute(tenantId, { id: userId, role: 'CASHIER', permissions: [] }, dto)
    ).rejects.toThrow(BadRequestException);
  });
});
