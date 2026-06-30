import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { ProductRepository } from '../repositories/product.repository';
import { Product } from '../../../../domain/entities/product.entity';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let mockTypeormRepository: jest.Mocked<Repository<Product>>;

  beforeEach(async () => {
    mockTypeormRepository = {
      find: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRepository,
        {
          provide: getRepositoryToken(Product),
          useValue: mockTypeormRepository,
        },
        {
          provide: REQUEST,
          useValue: { tenant_id: 'tenant-1' },
        },
      ],
    }).compile();

    repository = await module.resolve<ProductRepository>(ProductRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should find products by tenant', async () => {
    const mockProducts = [new Product({ id: '1', tenant_id: 'tenant-1' } as any)];
    mockTypeormRepository.find.mockResolvedValue(mockProducts);

    const result = await repository.findByTenant('tenant-1');
    expect(result).toEqual(mockProducts);
    expect(mockTypeormRepository.find).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1' },
    });
  });

  it('should save a product', async () => {
    const product = new Product({ sku: 'SKU-1' } as any);
    mockTypeormRepository.save.mockResolvedValue(product);

    const result = await repository.save(product);
    expect(result).toEqual(product);
    expect(mockTypeormRepository.save).toHaveBeenCalledWith(product);
  });

  it('should call query builder to find products with stock', async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          tenant_id: 'tenant-1',
          sku: 'SKU-1',
          name: 'Product 1',
          description: 'Desc 1',
          cost_usd: '10.0000',
          price_usd: '20.0000',
          tax_rate: '16.00',
          current_stock: '150',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]),
    };

    mockTypeormRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

    const result = await repository.findProductsWithStock({ sku: 'SKU-1', name: 'Product' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].current_stock).toBe(150);
    expect(result[0].price_usd).toBe(20);
    expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3); // deleted_at + sku + name
  });

  it('should call query builder to find all products with stock when no filters are passed', async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          tenant_id: 'tenant-1',
          sku: 'SKU-1',
          name: 'Product 1',
          description: 'Desc 1',
          cost_usd: '10.0000',
          price_usd: '20.0000',
          tax_rate: '16.00',
          current_stock: '150',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]),
    };

    mockTypeormRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

    const result = await repository.findProductsWithStock({}); // empty filters

    expect(result).toHaveLength(1);
    expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1); // only deleted_at IS NULL
  });
});
