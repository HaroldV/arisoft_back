import { Test, TestingModule } from '@nestjs/testing';
import { BranchesController } from '../branches.controller';
import { BranchesUseCase } from '../../../../application/use-cases/branches/branches.use-case';
import { JwtAuthGuard } from '../../../../infrastructure/auth/guards/jwt-auth.guard';
import { TenantActiveGuard } from '../../../../infrastructure/auth/guards/tenant-active.guard';

describe('BranchesController (STORY-18.1)', () => {
  let controller: BranchesController;
  let useCase: jest.Mocked<BranchesUseCase>;

  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    const mockUseCase = {
      listBranches: jest.fn().mockResolvedValue([{ id: 'branch-1', name: 'Principal' }]),
      getBranchById: jest.fn().mockResolvedValue({ id: 'branch-1', name: 'Principal' }),
      createBranch: jest.fn().mockResolvedValue({ id: 'branch-1', name: 'Nueva Sucursal' }),
      updateBranch: jest.fn().mockResolvedValue({ id: 'branch-1', name: 'Sucursal Actualizada' }),
      assignWarehouse: jest.fn().mockResolvedValue({ id: 'branch-1', default_warehouse_id: 'w-1' }),
      deleteBranch: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchesController],
      providers: [
        { provide: BranchesUseCase, useValue: mockUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(TenantActiveGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BranchesController>(BranchesController);
    useCase = module.get(BranchesUseCase);
  });

  it('should list branches for tenant', async () => {
    const req = { user: { tenant_id: tenantId, role: 'OWNER' } };
    const res = await controller.listBranches(req);
    expect(res).toHaveLength(1);
    expect(useCase.listBranches).toHaveBeenCalledWith(tenantId);
  });

  it('should pass userRole to createBranch', async () => {
    const req = { user: { tenant_id: tenantId, role: 'OWNER' } };
    const dto = { name: 'Sucursal 1', code: 'SUC-01' };
    await controller.createBranch(req, dto as any);
    expect(useCase.createBranch).toHaveBeenCalledWith(tenantId, 'OWNER', dto);
  });

  it('should assign warehouse to branch', async () => {
    const req = { user: { tenant_id: tenantId, role: 'OWNER' } };
    const dto = { warehouseId: 'w-1' };
    await controller.assignWarehouse(req, 'branch-1', dto);
    expect(useCase.assignWarehouse).toHaveBeenCalledWith(tenantId, 'OWNER', 'branch-1', 'w-1');
  });
});
