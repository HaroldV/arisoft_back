import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { StockMoveRepository } from '../repositories/stock-move.repository';
import { StockMove, StockMoveType } from '../../../../domain/entities/stock-move.entity';

describe('StockMoveRepository', () => {
  let repository: StockMoveRepository;
  let mockTypeormRepository: jest.Mocked<Repository<StockMove>>;

  beforeEach(async () => {
    mockTypeormRepository = {
      save: jest.fn(),
      find: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMoveRepository,
        {
          provide: getRepositoryToken(StockMove),
          useValue: mockTypeormRepository,
        },
        {
          provide: REQUEST,
          useValue: { tenant_id: 'tenant-1' },
        },
      ],
    }).compile();

    repository = await module.resolve<StockMoveRepository>(StockMoveRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should save a stock move', async () => {
    const move = { product_id: 'prod-1', type: StockMoveType.INITIAL_LOAD } as StockMove;
    mockTypeormRepository.save.mockResolvedValue(move);

    const result = await repository.save(move);
    expect(result).toEqual(move);
    expect(mockTypeormRepository.save).toHaveBeenCalledWith(move);
  });

  it('should find moves by product', async () => {
    const mockMoves = [{ id: 'move-1' }] as StockMove[];
    mockTypeormRepository.find.mockResolvedValue(mockMoves);

    const result = await repository.findByProduct('tenant-1', 'prod-1');
    expect(result).toEqual(mockMoves);
    expect(mockTypeormRepository.find).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1', product_id: 'prod-1' },
      order: { created_at: 'DESC' },
    });
  });
});
