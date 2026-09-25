import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BranchesUseCase } from '../branches.use-case';
import { BranchRepository } from '../../../../infrastructure/persistence/typeorm/repositories/branch.repository';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { WarehouseLocation } from '../../../../domain/entities/warehouse-location.entity';
import { Branch } from '../../../../domain/entities/branch.entity';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { SaasPlanEnum } from '../../../../domain/constants/domain.constants';

describe('BranchesUseCase (STORY-18.1)', () => {
  let useCase: BranchesUseCase;
  let branchRepo: jest.Mocked<BranchRepository>;
  let tenantRepo: any;
  let warehouseRepo: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const warehouseId = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    const mockBranchRepo = {
      findByTenantId: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      countByTenantId: jest.fn(),
      save: jest.fn().mockImplementation((b) => Promise.resolve({ id: 'branch-1', ...b })),
      delete: jest.fn(),
    };

    const mockTenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: tenantId, plan_type: SaasPlanEnum.COMERCIAL_PRO }),
    };

    const mockWarehouseRepo = {
      find: jest.fn().mockResolvedValue([{ id: warehouseId, name: 'Almacén Central', tenant_id: tenantId }]),
      findOne: jest.fn().mockResolvedValue({ id: warehouseId, name: 'Almacén Central', tenant_id: tenantId }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesUseCase,
        { provide: BranchRepository, useValue: mockBranchRepo },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: getRepositoryToken(WarehouseLocation), useValue: mockWarehouseRepo },
      ],
    }).compile();

    useCase = module.get<BranchesUseCase>(BranchesUseCase);
    branchRepo = module.get(BranchRepository);
    tenantRepo = module.get(getRepositoryToken(Tenant));
    warehouseRepo = module.get(getRepositoryToken(WarehouseLocation));
  });

  describe('Authorization & Security (AC-18.1.2)', () => {
    it('should reject non-OWNER users with ForbiddenException', async () => {
      await expect(
        useCase.createBranch(tenantId, 'CASHIER', { name: 'Sucursal 1', code: 'SUC-01' })
      ).rejects.toThrow(ForbiddenException);

      await expect(
        useCase.updateBranch(tenantId, 'MANAGER', 'branch-1', { name: 'Updated' })
      ).rejects.toThrow(ForbiddenException);

      await expect(
        useCase.assignWarehouse(tenantId, 'CASHIER', 'branch-1', warehouseId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow OWNER to create a branch', async () => {
      branchRepo.countByTenantId.mockResolvedValue(0);
      branchRepo.findByCode.mockResolvedValue(null);

      const result = await useCase.createBranch(tenantId, 'OWNER', {
        name: 'Sucursal Las Mercedes',
        code: 'SUC-01',
        defaultWarehouseId: warehouseId,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Sucursal Las Mercedes');
      expect(result.code).toBe('SUC-01');
      expect(result.is_main).toBe(true);
    });
  });

  describe('SaaS Plan Limits (AC-18.1.4)', () => {
    it('should reject creation when plan limit is reached', async () => {
      tenantRepo.findOne.mockResolvedValue({ id: tenantId, plan_type: SaasPlanEnum.EMPRENDEDOR });
      branchRepo.countByTenantId.mockResolvedValue(1); // Emprendedor max is 1

      await expect(
        useCase.createBranch(tenantId, 'OWNER', { name: 'Sucursal 2', code: 'SUC-02' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Warehouse Association (AC-18.1.1 & AC-18.1.2)', () => {
    it('should allow OWNER to reassign a warehouse to a branch', async () => {
      branchRepo.findById.mockResolvedValue(new Branch({ id: 'branch-1', tenant_id: tenantId, name: 'Sucursal 1', code: 'SUC-01' }));

      const updated = await useCase.assignWarehouse(tenantId, 'OWNER', 'branch-1', warehouseId);
      expect(updated.default_warehouse_id).toBe(warehouseId);
    });

    it('should throw NotFoundException if warehouse does not exist', async () => {
      branchRepo.findById.mockResolvedValue(new Branch({ id: 'branch-1', tenant_id: tenantId, name: 'Sucursal 1', code: 'SUC-01' }));
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(
        useCase.assignWarehouse(tenantId, 'OWNER', 'branch-1', 'non-existent-warehouse')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Auto-provisioning & Listing (STORY-18.1)', () => {
    it('should auto-provision Main Branch with first warehouse if tenant has 0 branches', async () => {
      branchRepo.findByTenantId
        .mockResolvedValueOnce([]) // First call returns 0 branches
        .mockResolvedValueOnce([
          new Branch({
            id: 'branch-main',
            tenant_id: tenantId,
            name: 'Sede Principal',
            code: 'MAIN',
            is_main: true,
            default_warehouse_id: warehouseId,
          }),
        ]);

      const result = await useCase.listBranches(tenantId);
      expect(branchRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sede Principal',
          code: 'MAIN',
          is_main: true,
          default_warehouse_id: warehouseId,
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sede Principal');
    });

    it('should auto-link first warehouse to existing Main Branch if warehouse is unassigned', async () => {
      const existingMainWithoutWh = new Branch({
        id: 'branch-main',
        tenant_id: tenantId,
        name: 'Sede Principal',
        code: 'MAIN',
        is_main: true,
        default_warehouse_id: undefined,
      });

      branchRepo.findByTenantId
        .mockResolvedValueOnce([existingMainWithoutWh])
        .mockResolvedValueOnce([{ ...existingMainWithoutWh, default_warehouse_id: warehouseId }]);

      const result = await useCase.listBranches(tenantId);
      expect(branchRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'branch-main',
          default_warehouse_id: warehouseId,
        })
      );
      expect(result[0].default_warehouse_id).toBe(warehouseId);
    });
  });
});
