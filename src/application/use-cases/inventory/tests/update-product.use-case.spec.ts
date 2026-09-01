import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UpdateProductUseCase } from '../update-product.use-case';
import { ProductRepository } from '../../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { CategoryRepository } from '../../../../infrastructure/persistence/typeorm/repositories/category.repository';
import { Product } from '../../../../domain/entities/product.entity';

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let productRepo: jest.Mocked<ProductRepository>;
  let stockMoveRepo: jest.Mocked<StockMoveRepository>;
  let categoryRepo: jest.Mocked<CategoryRepository>;

  const productId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const otherProductId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

  beforeEach(async () => {
    const mockProductRepo = {
      findById: jest.fn(),
      findBySkus: jest.fn(),
      save: jest.fn(),
    };
    const mockStockMoveRepo = {
      hasSales: jest.fn(),
    };
    const mockCategoryRepo = {
      findOrCreateByName: jest.fn().mockResolvedValue({ id: 'cat-id', name: 'General' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductUseCase,
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: StockMoveRepository, useValue: mockStockMoveRepo },
        { provide: CategoryRepository, useValue: mockCategoryRepo },
      ],
    }).compile();

    useCase = module.get<UpdateProductUseCase>(UpdateProductUseCase);
    productRepo = module.get(ProductRepository);
    stockMoveRepo = module.get(StockMoveRepository);
    categoryRepo = module.get(CategoryRepository);
  });

  it('should throw NotFoundException if product does not exist', async () => {
    productRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(productId, { name: 'New Name' })).rejects.toThrow(NotFoundException);
  });

  it('should successfully update secondary fields (description, price) even with sales history', async () => {
    const originalProduct = new Product({
      id: productId,
      sku: 'SKU-001',
      name: 'Original Name',
      description: 'Old Description',
      price_usd: 10,
    } as any);

    productRepo.findById.mockResolvedValue(originalProduct);
    productRepo.save.mockImplementation(async (p) => p);

    const result = await useCase.execute(productId, {
      description: 'New Description',
      priceUsd: 12.5,
    });

    expect(result.description).toBe('New Description');
    expect(result.price_usd).toBe(12.5);
    expect(result.sku).toBe('SKU-001'); // unmodified
    expect(result.name).toBe('Original Name'); // unmodified
    expect(stockMoveRepo.hasSales).not.toHaveBeenCalled(); // Shouldn't check sales history since name/sku didn't change
  });

  it('should throw ConflictException if trying to update SKU and it has sales history', async () => {
    const originalProduct = new Product({
      id: productId,
      sku: 'SKU-001',
      name: 'Original Name',
    } as any);

    productRepo.findById.mockResolvedValue(originalProduct);
    stockMoveRepo.hasSales.mockResolvedValue(true); // has sales

    await expect(useCase.execute(productId, { sku: 'SKU-001-NEW' })).rejects.toThrow(ConflictException);
    expect(stockMoveRepo.hasSales).toHaveBeenCalledWith(productId);
  });

  it('should throw ConflictException if trying to update Name and it has sales history', async () => {
    const originalProduct = new Product({
      id: productId,
      sku: 'SKU-001',
      name: 'Original Name',
    } as any);

    productRepo.findById.mockResolvedValue(originalProduct);
    stockMoveRepo.hasSales.mockResolvedValue(true); // has sales

    await expect(useCase.execute(productId, { name: 'New Name' })).rejects.toThrow(ConflictException);
  });

  it('should successfully update SKU and Name if no sales history and SKU is not duplicate', async () => {
    const originalProduct = new Product({
      id: productId,
      sku: 'SKU-001',
      name: 'Original Name',
    } as any);

    productRepo.findById.mockResolvedValue(originalProduct);
    stockMoveRepo.hasSales.mockResolvedValue(false); // no sales
    productRepo.findBySkus.mockResolvedValue([]); // new SKU is free
    productRepo.save.mockImplementation(async (p) => p);

    const result = await useCase.execute(productId, {
      sku: 'SKU-001-NEW',
      name: 'New Name',
    });

    expect(result.sku).toBe('SKU-001-NEW');
    expect(result.name).toBe('New Name');
    expect(stockMoveRepo.hasSales).toHaveBeenCalledWith(productId);
  });

  it('should throw ConflictException if updated SKU is already in use by another product', async () => {
    const originalProduct = new Product({
      id: productId,
      sku: 'SKU-001',
      name: 'Original Name',
    } as any);

    const existingProductWithNewSku = new Product({
      id: otherProductId, // different id
      sku: 'SKU-IN-USE',
      name: 'Other Product',
    } as any);

    productRepo.findById.mockResolvedValue(originalProduct);
    stockMoveRepo.hasSales.mockResolvedValue(false); // no sales
    productRepo.findBySkus.mockResolvedValue([existingProductWithNewSku]); // SKU in use!

    await expect(useCase.execute(productId, { sku: 'SKU-IN-USE' })).rejects.toThrow(ConflictException);
  });

  it('should successfully apply full product edit payload with advancedFields and categoryId', async () => {
    const originalProduct = new Product({
      id: productId,
      sku: 'SKU-MAZEITE-1L',
      name: 'Aceite Mazeite Maíz 1 Litro',
      cost_usd: 10.0,
      price_usd: 20.0,
      tax_rate: 16,
      category_id: 'e9a53879-d4fb-4322-951a-45d450b6a744',
      unit_of_measure: 'litros',
    } as any);

    productRepo.findById.mockResolvedValue(originalProduct);
    productRepo.save.mockImplementation(async (p) => p);

    const userPayload = {
      name: 'Aceite Mazeite Maíz 1 Litro',
      costUsd: 13.2,
      priceUsd: 24.1,
      taxRate: 16,
      categoryId: 'e9a53879-d4fb-4322-951a-45d450b6a744',
      unitOfMeasure: 'litros',
      variations: [],
      advancedFields: {
        expiration_date: '',
        location: '',
        security_stock: 0,
        description: '',
      },
    };

    const updated = await useCase.execute(productId, userPayload);

    expect(updated.cost_usd).toBe(13.2);
    expect(updated.price_usd).toBe(24.1);
    expect(updated.tax_rate).toBe(16);
    expect(updated.category_id).toBe('e9a53879-d4fb-4322-951a-45d450b6a744');
    expect(updated.unit_of_measure).toBe('litros');
    expect(updated.advanced_fields).toEqual(userPayload.advancedFields);
  });

  it('should successfully save multiple variations with distinct unit costs in JSONB column', async () => {
    const originalProduct = new Product({
      id: productId,
      sku: 'SKU-SHIRT',
      name: 'Camisa Polo Algodón',
      cost_usd: 10.0,
      price_usd: 25.0,
      tax_rate: 16,
      variations: [],
    } as any);

    productRepo.findById.mockResolvedValue(originalProduct);
    productRepo.save.mockImplementation(async (p) => p);

    const variationsPayload = [
      { name: 'Talla S - Azul', quantity: 10, unit_cost: 9.50 },
      { name: 'Talla M - Azul', quantity: 15, unit_cost: 10.00 },
      { name: 'Talla L - Rojo', quantity: 8, unit_cost: 11.20 },
      { name: 'Talla XL - Negro', quantity: 5, unit_cost: 12.00 },
    ];

    const result = await useCase.execute(productId, {
      variations: variationsPayload,
    });

    expect(result.variations).toHaveLength(4);
    expect(result.variations[0]).toEqual({ name: 'Talla S - Azul', quantity: 10, unit_cost: 9.50 });
    expect(result.variations[2].unit_cost).toBe(11.20);
    expect(productRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      variations: variationsPayload,
    }));
  });
});
