import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { SaleRepository } from '../repositories/sale.repository';
import { Sale } from '../../../../domain/entities/sale.entity';

describe('SaleRepository', () => {
  let repository: SaleRepository;
  let mockTypeormRepository: jest.Mocked<Repository<Sale>>;

  beforeEach(async () => {
    mockTypeormRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      manager: {
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaleRepository,
        {
          provide: getRepositoryToken(Sale),
          useValue: mockTypeormRepository,
        },
        {
          provide: REQUEST,
          useValue: { tenant_id: 'tenant-1' },
        },
      ],
    }).compile();

    repository = await module.resolve<SaleRepository>(SaleRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should find sales with cashier details', async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: 'sale-1',
          total_amount_usd: '150.5000',
          exchange_rate_applied: '1.0000',
          status: 'PAID',
          created_at: new Date(),
          user_id: 'user-1',
          cashier_name: 'Cashier Name',
          cashier_email: 'cashier@example.com',
        },
      ]),
    };

    mockTypeormRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

    const result = await repository.findSalesWithCashier();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sale-1');
    expect(result[0].total_amount_usd).toBe(150.5);
    expect(result[0].cashier.full_name).toBe('Cashier Name');
    expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
  });

  it('should find sale details by ID', async () => {
    const sale = new Sale({
      id: 'sale-123',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      total_amount_usd: 150.5,
      exchange_rate_applied: 1.0,
      status: 'PAID',
      created_at: new Date(),
    });

    mockTypeormRepository.findOne.mockResolvedValue(sale);
    (mockTypeormRepository.manager.findOne as jest.Mock).mockResolvedValue({
      id: 'user-1',
      full_name: 'Cashier Name',
      email: 'cashier@example.com',
    });

    const mockItemQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: 'item-1',
          product_id: 'product-1',
          quantity: 10,
          price_at_time_usd: '15.0500',
          product_sku: 'SKU-ABC',
          product_name: 'Product Name',
          justification: 'Negative stock allowed by owner',
        },
      ]),
    };

    (mockTypeormRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockItemQueryBuilder);

    const result = await repository.findSaleDetails('sale-123');

    expect(result).toBeDefined();
    expect(result.id).toBe('sale-123');
    expect(result.cashier.full_name).toBe('Cashier Name');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product_sku).toBe('SKU-ABC');
    expect(result.items[0].justification).toBe('Negative stock allowed by owner');
  });
});
