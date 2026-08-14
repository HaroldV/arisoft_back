import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DeleteProductUseCase } from '../delete-product.use-case';
import { ProductRepository } from '../../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { Product } from '../../../../domain/entities/product.entity';

describe('DeleteProductUseCase', () => {
  let useCase: DeleteProductUseCase;
  let productRepo: jest.Mocked<ProductRepository>;
  let stockMoveRepo: jest.Mocked<StockMoveRepository>;

  const productId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  beforeEach(async () => {
    const mockProductRepo = {
      findById: jest.fn(),
      softDelete: jest.fn(),
    };
    const mockStockMoveRepo = {
      hasSales: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteProductUseCase,
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: StockMoveRepository, useValue: mockStockMoveRepo },
      ],
    }).compile();

    useCase = module.get<DeleteProductUseCase>(DeleteProductUseCase);
    productRepo = module.get(ProductRepository);
    stockMoveRepo = module.get(StockMoveRepository);
  });

  it('should throw NotFoundException if product does not exist', async () => {
    productRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(productId)).rejects.toThrow(NotFoundException);
  });

  it('should successfully soft delete product if there is no sales history', async () => {
    const product = new Product({
      id: productId,
      sku: 'SKU-001',
      name: 'Test Product',
    } as any);

    productRepo.findById.mockResolvedValue(product);
    stockMoveRepo.hasSales.mockResolvedValue(false); // no sales
    productRepo.softDelete.mockResolvedValue();

    await useCase.execute(productId);

    expect(stockMoveRepo.hasSales).toHaveBeenCalledWith(productId);
    expect(productRepo.softDelete).toHaveBeenCalledWith(productId);
  });

  it('should throw ConflictException if product has sales history', async () => {
    const product = new Product({
      id: productId,
      sku: 'SKU-001',
      name: 'Test Product',
    } as any);

    productRepo.findById.mockResolvedValue(product);
    stockMoveRepo.hasSales.mockResolvedValue(true); // HAS sales!

    await expect(useCase.execute(productId)).rejects.toThrow(ConflictException);
    expect(productRepo.softDelete).not.toHaveBeenCalled();
  });
});
