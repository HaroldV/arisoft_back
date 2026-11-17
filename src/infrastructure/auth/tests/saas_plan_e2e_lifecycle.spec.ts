import { SaasPlanEnum, PLAN_DEFAULT_PERMISSIONS, PLAN_DEFAULT_MODULES, BACKEND_SYSTEM_CONSTANTS } from '../../../domain/constants/domain.constants';
import { UserRole, User } from '../../../domain/entities/user.entity';
import { CreateUserUseCase } from '../../../application/use-cases/user/create-user.use-case';
import { BranchesUseCase } from '../../../application/use-cases/branches/branches.use-case';
import { AppModule } from '../decorators/modules.decorator';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('SaaS Plan Full Lifecycle & Multi-Tenant Access Gate (CI/CD Quality Gate)', () => {
  describe('1. Cuentas de Prueba: Matriz de Accesos y Permisos Reales', () => {
    it('Cuenta Demo Emprendedor debe tener exactamente los submódulos autorizados y bloqueados', () => {
      const permissions = PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.EMPRENDEDOR];
      const modules = PLAN_DEFAULT_MODULES[SaasPlanEnum.EMPRENDEDOR];

      // Submódulos Permitidos
      expect(permissions).toContain('pos:create');
      expect(permissions).toContain('pos:shifts');
      expect(permissions).toContain('sales:invoicing');
      expect(permissions).toContain('clients:manage');
      expect(permissions).toContain('purchases:new');
      expect(permissions).toContain('purchases:invoices');
      expect(permissions).toContain('providers:manage');
      expect(permissions).toContain('inventory:create');
      expect(permissions).toContain('inventory:stock');
      expect(permissions).toContain('inventory:view');
      expect(permissions).toContain('inventory:write');
      expect(permissions).toContain('inventory:adjust');
      expect(permissions).toContain('inventory:warehouse');
      expect(permissions).toContain('inventory:categories');
      expect(permissions).toContain('banks:accounts');
      expect(permissions).toContain('company:manage');
      expect(permissions).toContain('fiscal:manage');
      expect(permissions).toContain('users:manage');

      // Submódulos Estrictamente Prohibidos en Emprendedor
      expect(permissions).not.toContain('banks:ledger');
      expect(permissions).not.toContain('branches:manage');
      expect(permissions).not.toContain('sales:quotations');
      expect(permissions).not.toContain('sales:orders');
      expect(permissions).not.toContain('sales:deliveries');
      expect(permissions).not.toContain('purchases:orders');
      expect(permissions).not.toContain('purchases:receptions');
      expect(permissions).not.toContain('accounts:receivables');
      expect(permissions).not.toContain('accounts:payables');
      expect(permissions).not.toContain('accounts:history');
      expect(permissions).not.toContain('reports:view');
      expect(permissions).not.toContain('payroll:manage');

      expect(modules).not.toContain('PAYROLL');
      expect(modules).not.toContain('REPORTS');
    });

    it('Cuenta Demo Comercial Pro debe tener suite extendida de preventa, compras y finanzas', () => {
      const permissions = PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.COMERCIAL_PRO];
      const modules = PLAN_DEFAULT_MODULES[SaasPlanEnum.COMERCIAL_PRO];

      // Preventa extendida
      expect(permissions).toContain('sales:quotations');
      expect(permissions).toContain('sales:orders');
      expect(permissions).toContain('sales:deliveries');
      expect(permissions).toContain('pos:shifts');

      // Compras formales
      expect(permissions).toContain('purchases:orders');
      expect(permissions).toContain('purchases:receptions');
      expect(permissions).toContain('purchases:invoices');
      expect(permissions).not.toContain('purchases:new');

      // Finanzas completas
      expect(permissions).toContain('banks:accounts');
      expect(permissions).toContain('banks:ledger');
      expect(permissions).toContain('accounts:receivables');
      expect(permissions).toContain('accounts:payables');
      expect(permissions).toContain('accounts:history');

      // Gestión de sucursales
      expect(permissions).toContain('branches:manage');
      expect(permissions).toContain('reports:view');

      expect(modules).toContain('REPORTS');
      expect(modules).not.toContain('PAYROLL');
    });
  });

  describe('2. Comportamiento y Cuotas de Registro (Límites por Plan)', () => {
    let mockUserRepo: any;
    let mockTenantRepo: any;
    let mockAuthService: any;
    let createUserUseCase: CreateUserUseCase;

    beforeEach(() => {
      mockUserRepo = {
        findByUsernameAndTenant: jest.fn().mockResolvedValue(null),
        findByEmail: jest.fn().mockResolvedValue(null),
        findAllByTenant: jest.fn(),
        create: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      };
      mockTenantRepo = {
        findById: jest.fn(),
      };
      mockAuthService = {
        hashPassword: jest.fn().mockResolvedValue('hashed_password'),
      };

      createUserUseCase = new CreateUserUseCase(
        mockUserRepo,
        mockTenantRepo,
        mockAuthService,
      );
    });

    it('Emprendedor no puede registrar más de 2 usuarios (Cuota Máxima)', async () => {
      const tenantId = 'tenant-emp-01';
      const ownerCreator = {
        id: 'user-owner',
        tenant_id: tenantId,
        role: UserRole.OWNER,
        enabled_modules: PLAN_DEFAULT_MODULES[SaasPlanEnum.EMPRENDEDOR],
        permissions: PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.EMPRENDEDOR],
      };

      mockTenantRepo.findById.mockResolvedValue({
        id: tenantId,
        plan_type: SaasPlanEnum.EMPRENDEDOR,
        settings: { max_users: 2 },
      });

      // Simular que ya existen 2 usuarios registrados
      mockUserRepo.findAllByTenant.mockResolvedValue([
        new User({ id: 'user-owner', tenant_id: tenantId, role: UserRole.OWNER }),
        new User({ id: 'user-cajero', tenant_id: tenantId, role: UserRole.CASHIER }),
      ]);

      await expect(
        createUserUseCase.execute(ownerCreator, {
          full_name: 'Tercer Usuario',
          email: 'tercero@gmail.com',
          username: 'tercero',
          password: 'Password123*',
          role: UserRole.CASHIER,
          allowed_modules: [AppModule.POS],
          allowed_permissions: ['pos:create'],
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('Emprendedor no puede delegar permisos fuera de su plan (ej. cotizaciones o libro mayor)', async () => {
      const tenantId = 'tenant-emp-02';
      const ownerCreator = {
        id: 'user-owner',
        tenant_id: tenantId,
        role: UserRole.OWNER,
        enabled_modules: PLAN_DEFAULT_MODULES[SaasPlanEnum.EMPRENDEDOR],
        permissions: PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.EMPRENDEDOR],
      };

      mockTenantRepo.findById.mockResolvedValue({
        id: tenantId,
        plan_type: SaasPlanEnum.EMPRENDEDOR,
        settings: {
          max_users: 2,
          enabled_modules: PLAN_DEFAULT_MODULES[SaasPlanEnum.EMPRENDEDOR],
          enabled_permissions: PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.EMPRENDEDOR],
        },
      });

      mockUserRepo.findAllByTenant.mockResolvedValue([
        new User({ id: 'user-owner', tenant_id: tenantId, role: UserRole.OWNER }),
      ]);

      await expect(
        createUserUseCase.execute(ownerCreator, {
          full_name: 'Cajero Cotizador',
          email: 'cajero@gmail.com',
          username: 'cajero',
          password: 'Password123*',
          role: UserRole.CASHIER,
          allowed_modules: [AppModule.SALES],
          allowed_permissions: ['sales:quotations'],
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Restricción Estricta de Sucursales (Branches Isolation)', () => {
    let branchesUseCase: BranchesUseCase;
    let mockBranchRepo: any;
    let mockTenantRepo: any;
    let mockWarehouseRepo: any;

    beforeEach(() => {
      mockBranchRepo = {
        countByTenantId: jest.fn(),
        findByCode: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockImplementation((b) => Promise.resolve({ id: 'branch-new', ...b })),
      };
      mockTenantRepo = {
        findOne: jest.fn(),
      };
      mockWarehouseRepo = {
        find: jest.fn().mockResolvedValue([]),
      };

      branchesUseCase = new BranchesUseCase(
        mockBranchRepo,
        mockTenantRepo,
        mockWarehouseRepo,
      );
    });

    it('Emprendedor tiene límite de 1 sucursal y no puede crear una segunda sede física', async () => {
      const tenantId = 'tenant-emp-branch';
      mockTenantRepo.findOne.mockResolvedValue({
        id: tenantId,
        plan_type: SaasPlanEnum.EMPRENDEDOR,
      });

      mockBranchRepo.countByTenantId.mockResolvedValue(1);

      await expect(
        branchesUseCase.createBranch(tenantId, UserRole.OWNER, {
          name: 'Segunda Sucursal',
          code: 'SUC-02',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('Comercial Pro permite hasta 3 sucursales', async () => {
      const tenantId = 'tenant-com-branch';
      mockTenantRepo.findOne.mockResolvedValue({
        id: tenantId,
        plan_type: SaasPlanEnum.COMERCIAL_PRO,
      });

      mockBranchRepo.countByTenantId.mockResolvedValue(1);

      const newBranch = await branchesUseCase.createBranch(tenantId, UserRole.OWNER, {
        name: 'Sucursal Centro',
        code: 'SUC-02',
      });

      expect(newBranch).toBeDefined();
      expect(newBranch.code).toBe('SUC-02');
    });
  });
});
