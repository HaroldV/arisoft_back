import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CreateRoleUseCase } from '../create-role.use-case';
import { RoleRepository } from '../../../../infrastructure/persistence/typeorm/repositories/role.repository';
import { Role } from '../../../../domain/entities/role.entity';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let roleRepository: jest.Mocked<RoleRepository>;

  const mockRoleRepository = {
    findByName: jest.fn(),
    save: jest.fn().mockImplementation((role) => Promise.resolve(role)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRoleUseCase,
        { provide: RoleRepository, useValue: mockRoleRepository },
      ],
    }).compile();

    useCase = module.get<CreateRoleUseCase>(CreateRoleUseCase);
    roleRepository = module.get<RoleRepository>(RoleRepository) as any;
  });

  it('should successfully create a custom role', async () => {
    roleRepository.findByName.mockResolvedValue(null);

    const result = await useCase.execute(
      'tenant-1',
      { role: 'MANAGER', permissions: ['pos:create', 'inventory:view'] },
      { name: 'Cajero Senior', allowed_permissions: ['pos:create'] },
    );

    expect(result).toBeDefined();
    expect(result.name).toBe('Cajero Senior');
    expect(result.allowed_permissions).toContain('pos:create');
    expect(result.is_system).toBe(false);
  });

  it('should throw BadRequestException if role name already exists', async () => {
    roleRepository.findByName.mockResolvedValue(new Role({ name: 'Duplicate' }));

    await expect(
      useCase.execute(
        'tenant-1',
        { role: 'OWNER', permissions: [] },
        { name: 'Duplicate', allowed_permissions: [] },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if creator attempts to assign unauthorized permissions', async () => {
    roleRepository.findByName.mockResolvedValue(null);

    await expect(
      useCase.execute(
        'tenant-1',
        { role: 'MANAGER', permissions: ['pos:create'] }, // Manager only has pos:create
        { name: 'Supervisor', allowed_permissions: ['pos:create', 'inventory:write'] }, // Trying to delegate inventory:write
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
