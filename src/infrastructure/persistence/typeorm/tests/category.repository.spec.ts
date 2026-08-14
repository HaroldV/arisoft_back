import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '../../../../domain/entities/category.entity';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let mockTypeormRepository: jest.Mocked<Repository<Category>>;

  beforeEach(async () => {
    mockTypeormRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryRepository,
        {
          provide: getRepositoryToken(Category),
          useValue: mockTypeormRepository,
        },
        {
          provide: REQUEST,
          useValue: { tenant_id: 'tenant-1' },
        },
      ],
    }).compile();

    repository = await module.resolve<CategoryRepository>(CategoryRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should find tenant categories using distinct on query', async () => {
    const mockRaw = [
      { id: '1', tenant_id: null, name: 'Alimentos', code: '47111', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: '2', tenant_id: 'tenant-1', name: 'Repuestos', code: '45300', is_active: true, created_at: new Date(), updated_at: new Date() },
    ];
    mockTypeormRepository.query.mockResolvedValue(mockRaw);

    const result = await repository.findTenantCategories();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alimentos');
    expect(result[1].tenant_id).toBe('tenant-1');
    expect(mockTypeormRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('DISTINCT ON (LOWER(name))'),
      ['tenant-1']
    );
  });

  it('should find category by name', async () => {
    const mockRaw = [
      { id: '1', tenant_id: null, name: 'General', code: '47190', is_active: true, created_at: new Date(), updated_at: new Date() }
    ];
    mockTypeormRepository.query.mockResolvedValue(mockRaw);

    const result = await repository.findByName('General');
    expect(result).toBeDefined();
    expect(result!.name).toBe('General');
  });

  it('should create new category if it does not exist', async () => {
    const mockRaw: any[] = [];
    mockTypeormRepository.query.mockResolvedValue(mockRaw);
    
    const mockSaved = new Category({ id: 'new-id', tenant_id: 'tenant-1', name: 'Nueva', code: null, is_active: true });
    mockTypeormRepository.create.mockReturnValue(mockSaved);
    mockTypeormRepository.save.mockResolvedValue(mockSaved);

    const result = await repository.findOrCreateByName('Nueva');
    expect(result).toEqual(mockSaved);
    expect(mockTypeormRepository.create).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      name: 'Nueva',
      code: null,
      is_active: true,
    });
    expect(mockTypeormRepository.save).toHaveBeenCalledWith(mockSaved);
  });
});
