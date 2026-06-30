import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { PurchaseInvoiceRepository } from '../repositories/purchase-invoice.repository';
import { PurchaseInvoice } from '../../../../domain/entities/purchase-invoice.entity';

describe('PurchaseInvoiceRepository', () => {
  let repository: PurchaseInvoiceRepository;
  let mockTypeormRepository: jest.Mocked<Repository<PurchaseInvoice>>;

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
        PurchaseInvoiceRepository,
        {
          provide: getRepositoryToken(PurchaseInvoice),
          useValue: mockTypeormRepository,
        },
        {
          provide: REQUEST,
          useValue: { tenant_id: 'tenant-1' },
        },
      ],
    }).compile();

    repository = await module.resolve<PurchaseInvoiceRepository>(PurchaseInvoiceRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should find purchases with creator details', async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: '1',
          invoice_number: 'INV-123',
          supplier_name: 'Supplier A',
          total_amount_usd: '150.5000',
          proof_file_path: 'path/to/proof.pdf',
          created_by_user_id: 'user-1',
          created_at: new Date(),
          creator_name: 'Creator Name',
          creator_email: 'creator@example.com',
        },
      ]),
    };

    mockTypeormRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

    const result = await repository.findPurchasesWithCreator();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].total_amount_usd).toBe(150.5);
    expect(result[0].created_by.full_name).toBe('Creator Name');
    expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
  });

  it('should find purchase details by ID', async () => {
    const invoice = new PurchaseInvoice({
      id: 'invoice-123',
      tenant_id: 'tenant-1',
      invoice_number: 'INV-123',
      supplier_name: 'Supplier A',
      total_amount_usd: 150.5,
      created_by_user_id: 'user-1',
      created_at: new Date(),
    });

    mockTypeormRepository.findOne.mockResolvedValue(invoice);
    (mockTypeormRepository.manager.findOne as jest.Mock).mockResolvedValue({
      id: 'user-1',
      full_name: 'Creator Name',
      email: 'creator@example.com',
    });

    const mockItemQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: 'item-1',
          product_id: 'product-1',
          quantity: 10,
          unit_cost_usd: '15.0500',
          product_sku: 'SKU-ABC',
          product_name: 'Product Name',
        },
      ]),
    };

    (mockTypeormRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockItemQueryBuilder);

    const result = await repository.findPurchaseDetails('invoice-123');

    expect(result).toBeDefined();
    expect(result.id).toBe('invoice-123');
    expect(result.created_by.full_name).toBe('Creator Name');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product_sku).toBe('SKU-ABC');
    expect(result.items[0].unit_cost_usd).toBe(15.05);
  });
});
