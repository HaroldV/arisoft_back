import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateUserUseCase } from '../create-user.use-case';
import { ListUsersUseCase } from '../list-users.use-case';
import { UpdateUserUseCase } from '../update-user.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { TenantRepository } from '../../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { AuthService } from '../../auth/auth.service';
import { User, UserRole } from '../../../../domain/entities/user.entity';
import { AppModule } from '../../../../infrastructure/auth/decorators/modules.decorator';

describe('User Hierarchical Management Use Cases', () => {
  let createUserUseCase: CreateUserUseCase;
  let listUsersUseCase: ListUsersUseCase;
  let updateUserUseCase: UpdateUserUseCase;
  
  let userRepository: jest.Mocked<IUserRepository>;
  let authService: jest.Mocked<AuthService>;
  let tenantRepository: jest.Mocked<TenantRepository>;

  let mockOwner: User;
  let mockManager: User;
  let mockCashier: User;

  const mockTenant = {
    id: 'tenant-1',
    company_name: 'Test Tenant',
    tax_id: 'J-12345678-9',
    plan_type: 'TRIAL_90',
    settings: {
      enabled_modules: ['POS', 'INVENTORY', 'PAYROLL'],
    },
    is_active: true,
  };

  beforeEach(async () => {
    mockOwner = new User({
      id: 'owner-id',
      tenant_id: 'tenant-1',
      full_name: 'Owner User',
      email: 'owner@ari.com',
      role: UserRole.OWNER,
      allowed_modules: ['POS', 'INVENTORY', 'PAYROLL'],
      allowed_permissions: ['pos:create', 'pos:discount', 'pos:refund', 'inventory:view', 'inventory:write'],
      is_active: true,
    });

    mockManager = new User({
      id: 'manager-id',
      tenant_id: 'tenant-1',
      full_name: 'Manager User',
      email: 'manager@ari.com',
      role: UserRole.MANAGER,
      creator_id: 'owner-id',
      allowed_modules: ['POS', 'INVENTORY'],
      allowed_permissions: ['pos:create', 'inventory:view'],
      is_active: true,
    });

    mockCashier = new User({
      id: 'cashier-id',
      tenant_id: 'tenant-1',
      full_name: 'Cashier User',
      email: 'cashier@ari.com',
      role: UserRole.CASHIER,
      creator_id: 'manager-id',
      allowed_modules: ['POS'],
      allowed_permissions: ['pos:create'],
      is_active: true,
    });

    const mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
      findAllByTenant: jest.fn().mockResolvedValue([mockOwner, mockManager, mockCashier]),
      findSubordinatesRecursive: jest.fn().mockResolvedValue([mockCashier]),
    };

    const mockAuthService = {
      hashPassword: jest.fn().mockResolvedValue('hashed_password'),
    };

    const mockTenantRepository = {
      findById: jest.fn().mockResolvedValue(mockTenant),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        ListUsersUseCase,
        UpdateUserUseCase,
        { provide: 'IUserRepository', useValue: mockUserRepository },
        { provide: TenantRepository, useValue: mockTenantRepository },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    createUserUseCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    listUsersUseCase = module.get<ListUsersUseCase>(ListUsersUseCase);
    updateUserUseCase = module.get<UpdateUserUseCase>(UpdateUserUseCase);

    userRepository = module.get('IUserRepository');
    authService = module.get<AuthService>(AuthService) as any;
    tenantRepository = module.get<TenantRepository>(TenantRepository) as any;
  });

  describe('CreateUserUseCase', () => {
    it('should throw ForbiddenException if tenant has reached maximum user quota for their SaaS plan', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      // Simulate 2 existing users on a 2-user limit plan
      userRepository.findAllByTenant.mockResolvedValue([mockOwner, mockManager]);
      tenantRepository.findById.mockResolvedValue({
        ...mockTenant,
        plan_type: 'EMPRENDEDOR',
        settings: { max_users: 2 },
      } as any);

      await expect(
        createUserUseCase.execute(
          {
            id: 'owner-id',
            role: 'OWNER',
            tenant_id: 'tenant-1',
            enabled_modules: ['POS', 'INVENTORY'],
            permissions: ['pos:create'],
          },
          {
            full_name: 'Third User Attempt',
            email: 'third@ari.com',
            password: 'password123',
            role: UserRole.CASHIER,
            allowed_modules: [AppModule.POS],
            allowed_permissions: ['pos:create'],
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Owner to create any user with valid permissions', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findAllByTenant.mockResolvedValue([mockOwner]);
      tenantRepository.findById.mockResolvedValue({
        ...mockTenant,
        plan_type: 'COMERCIAL_PRO',
        settings: { max_users: 5 },
      } as any);

      const result = await createUserUseCase.execute(
        { 
          id: 'owner-id', 
          role: 'OWNER', 
          tenant_id: 'tenant-1', 
          enabled_modules: ['POS', 'INVENTORY', 'PAYROLL'],
          permissions: ['pos:create', 'pos:discount', 'inventory:stock']
        },
        {
          full_name: 'New Manager',
          email: 'new-manager@ari.com',
          password: 'password123',
          role: UserRole.MANAGER,
          allowed_modules: [AppModule.POS, AppModule.INVENTORY],
          allowed_permissions: ['pos:create', 'inventory:stock'],
        },
      );

      expect(result).toBeDefined();
      expect(result.user.full_name).toBe('New Manager');
      expect(result.user.creator_id).toBe('owner-id');
      expect(result.user.allowed_permissions).toContain('pos:create');
    });

    it('should allow Manager to create Cashier with subset of permissions', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findAllByTenant.mockResolvedValue([mockOwner]);
      tenantRepository.findById.mockResolvedValue({
        ...mockTenant,
        plan_type: 'COMERCIAL_PRO',
        settings: { max_users: 5 },
      } as any);

      const result = await createUserUseCase.execute(
        { 
          id: 'manager-id', 
          role: 'MANAGER', 
          tenant_id: 'tenant-1', 
          enabled_modules: ['POS', 'INVENTORY'],
          permissions: ['pos:create', 'inventory:view']
        },
        {
          full_name: 'New Cashier',
          email: 'new-cashier@ari.com',
          password: 'password123',
          role: UserRole.CASHIER,
          allowed_modules: [AppModule.POS],
          allowed_permissions: ['pos:create'],
        },
      );

      expect(result.user.role).toBe(UserRole.CASHIER);
      expect(result.user.creator_id).toBe('manager-id');
      expect(result.user.allowed_permissions).toContain('pos:create');
    });

    it('should block Manager from assigning permissions they do not have', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        createUserUseCase.execute(
          { 
            id: 'manager-id', 
            role: 'MANAGER', 
            tenant_id: 'tenant-1', 
            enabled_modules: ['POS', 'INVENTORY'],
            permissions: ['pos:create', 'inventory:view']
          },
          {
            full_name: 'New Cashier',
            email: 'new-cashier@ari.com',
            password: 'password123',
            role: UserRole.CASHIER,
            allowed_modules: [AppModule.POS],
            allowed_permissions: ['pos:discount'], // Manager does not have pos:discount
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block Cashier from creating users', async () => {
      await expect(
        createUserUseCase.execute(
          { 
            id: 'cashier-id', 
            role: 'CASHIER', 
            tenant_id: 'tenant-1', 
            enabled_modules: ['POS'],
            permissions: ['pos:create']
          },
          {
            full_name: 'Sub Cashier',
            email: 'sub-cashier@ari.com',
            password: 'password123',
            role: UserRole.CASHIER,
            allowed_modules: [AppModule.POS],
            allowed_permissions: ['pos:create'],
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ListUsersUseCase', () => {
    it('should return all tenant users for Owner', async () => {
      const result = await listUsersUseCase.execute({ id: 'owner-id', role: 'OWNER', tenant_id: 'tenant-1' });
      expect(result).toHaveLength(3);
      expect(userRepository.findAllByTenant).toHaveBeenCalledWith('tenant-1');
    });

    it('should return only subordinates for Manager', async () => {
      const result = await listUsersUseCase.execute({ id: 'manager-id', role: 'MANAGER', tenant_id: 'tenant-1' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cashier-id');
      expect(userRepository.findSubordinatesRecursive).toHaveBeenCalledWith('tenant-1', 'manager-id');
    });
  });

  describe('UpdateUserUseCase', () => {
    it('should allow Owner to update any user', async () => {
      userRepository.findById.mockResolvedValue(mockCashier);

      const result = await updateUserUseCase.execute(
        { 
          id: 'owner-id', 
          role: 'OWNER', 
          tenant_id: 'tenant-1', 
          enabled_modules: ['POS', 'INVENTORY', 'PAYROLL'],
          permissions: ['pos:create', 'pos:discount']
        },
        'cashier-id',
        { full_name: 'Cashier Updated' },
      );

      expect(result.user.full_name).toBe('Cashier Updated');
    });

    it('should block Manager from updating users outside their tree', async () => {
      const externalUser = new User({
        id: 'external-id',
        tenant_id: 'tenant-1',
        role: UserRole.MANAGER,
        creator_id: 'another-manager',
      });
      userRepository.findById.mockResolvedValue(externalUser);

      await expect(
        updateUserUseCase.execute(
          { 
            id: 'manager-id', 
            role: 'MANAGER', 
            tenant_id: 'tenant-1', 
            enabled_modules: ['POS', 'INVENTORY'],
            permissions: ['pos:create']
          },
          'external-id',
          { full_name: 'Hacked' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should cascade deactivation to subordinates when transfer_subordinates_to_id is omitted', async () => {
      userRepository.findById.mockResolvedValue(mockManager);
      const mockSub1 = new User({ id: 'sub-1', tenant_id: 'tenant-1', is_active: true });
      const mockSub2 = new User({ id: 'sub-2', tenant_id: 'tenant-1', is_active: false });
      userRepository.findSubordinatesRecursive.mockResolvedValue([mockSub1, mockSub2]);

      await updateUserUseCase.execute(
        { 
          id: 'owner-id', 
          role: 'OWNER', 
          tenant_id: 'tenant-1', 
          enabled_modules: ['POS', 'INVENTORY', 'PAYROLL'],
          permissions: ['users:manage']
        },
        'manager-id',
        { is_active: false },
      );

      expect(mockSub1.is_active).toBe(false);
      expect(userRepository.save).toHaveBeenCalledWith(mockSub1);
    });

    it('should reassign direct subordinates to new supervisor when transfer_subordinates_to_id is provided', async () => {
      userRepository.findById.mockImplementation((id) => {
        if (id === 'manager-id') return Promise.resolve(mockManager);
        if (id === 'another-manager-id') {
          return Promise.resolve(new User({
            id: 'another-manager-id',
            tenant_id: 'tenant-1',
            is_active: true,
            role: UserRole.MANAGER,
          }));
        }
        return Promise.resolve(null);
      });

      const mockSub1 = new User({ id: 'sub-1', tenant_id: 'tenant-1', creator_id: 'manager-id', is_active: true });
      const mockSub2 = new User({ id: 'sub-2', tenant_id: 'tenant-1', creator_id: 'other-creator', is_active: true });
      userRepository.findSubordinatesRecursive.mockResolvedValue([mockSub1, mockSub2]);

      await updateUserUseCase.execute(
        { 
          id: 'owner-id', 
          role: 'OWNER', 
          tenant_id: 'tenant-1', 
          enabled_modules: ['POS', 'INVENTORY', 'PAYROLL'],
          permissions: ['users:manage']
        },
        'manager-id',
        { 
          is_active: false,
          transfer_subordinates_to_id: 'another-manager-id'
        },
      );

      expect(mockSub1.creator_id).toBe('another-manager-id');
      expect(mockSub2.creator_id).toBe('other-creator'); // Should remain untouched (not direct subordinate)
      expect(userRepository.save).toHaveBeenCalledWith(mockSub1);
    });
  });
});
