import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { EmployeeLoginUseCase } from './employee-login.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { TenantRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/typeorm/repositories/refresh-token.repository';
import { AuthService } from './auth.service';
import { RoleRepository } from '../../../infrastructure/persistence/typeorm/repositories/role.repository';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { Tenant } from '../../../domain/entities/tenant.entity';

describe('EmployeeLoginUseCase', () => {
  let useCase: EmployeeLoginUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let authService: jest.Mocked<AuthService>;
  let roleRepository: jest.Mocked<RoleRepository>;

  const mockTenant: Tenant = {
    id: 'tenant-123',
    company_name: 'Empresa Test C.A.',
    tax_id: 'J-12345678-0',
    is_active: true,
    plan_is_active: true,
    plan_type: 'ENTERPRISE',
    settings: {
      enabled_modules: ['POS', 'INVENTORY'],
    },
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Tenant;

  const mockEmployeeUser = new User({
    id: 'user-emp-1',
    tenant_id: 'tenant-123',
    full_name: 'Cajero Uno',
    username: 'cajero1',
    email: undefined,
    password_hash: 'hashed_password',
    role: UserRole.CASHIER,
    is_active: true,
    failed_login_attempts: 0,
    allowed_permissions: ['pos:create', 'clients:manage'],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeLoginUseCase,
        {
          provide: 'IUserRepository',
          useValue: {
            findByEmail: jest.fn(),
            findByUsernameAndTenant: jest.fn(),
            findById: jest.fn(),
            save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
            findAllByTenant: jest.fn(),
            findSubordinatesRecursive: jest.fn(),
          },
        },
        {
          provide: TenantRepository,
          useValue: {
            findByTaxId: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: RefreshTokenRepository,
          useValue: {
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: AuthService,
          useValue: {
            comparePassword: jest.fn(),
            generateAccessToken: jest.fn().mockResolvedValue('mock_access_token'),
            generateRefreshToken: jest.fn().mockResolvedValue('mock_refresh_token'),
          },
        },
        {
          provide: RoleRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    useCase = module.get<EmployeeLoginUseCase>(EmployeeLoginUseCase);
    userRepository = module.get('IUserRepository');
    tenantRepository = module.get(TenantRepository);
    refreshTokenRepository = module.get(RefreshTokenRepository);
    authService = module.get(AuthService);
    roleRepository = module.get(RoleRepository);
  });

  it('should authenticate employee successfully with correct RIF, username and password', async () => {
    tenantRepository.findByTaxId.mockResolvedValue(mockTenant);
    userRepository.findByUsernameAndTenant.mockResolvedValue(mockEmployeeUser);
    authService.comparePassword.mockResolvedValue(true);

    const result = await useCase.execute({
      taxId: 'j-12345678-0',
      username: 'CAJERO1',
      password: 'password123',
    });

    expect(tenantRepository.findByTaxId).toHaveBeenCalledWith('J-12345678-0');
    expect(userRepository.findByUsernameAndTenant).toHaveBeenCalledWith('cajero1', 'tenant-123');
    expect(result.access_token).toBe('mock_access_token');
    expect(result.user.username).toBe('cajero1');
    expect(result.user.full_name).toBe('Cajero Uno');
  });

  it('should throw UnauthorizedException if tenant is not found', async () => {
    tenantRepository.findByTaxId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        taxId: 'J-00000000-0',
        username: 'cajero1',
        password: 'password123',
      }),
    ).rejects.toThrow('Empresa no encontrada con el RIF especificado');
  });

  it('should throw UnauthorizedException if user is not found in tenant', async () => {
    tenantRepository.findByTaxId.mockResolvedValue(mockTenant);
    userRepository.findByUsernameAndTenant.mockResolvedValue(null);

    await expect(
      useCase.execute({
        taxId: 'J-12345678-0',
        username: 'inexistente',
        password: 'password123',
      }),
    ).rejects.toThrow('Credenciales inválidas para esta empresa');
  });

  it('should increment failed_login_attempts on wrong password', async () => {
    const userToFail = new User({ ...mockEmployeeUser, failed_login_attempts: 0 });
    tenantRepository.findByTaxId.mockResolvedValue(mockTenant);
    userRepository.findByUsernameAndTenant.mockResolvedValue(userToFail);
    authService.comparePassword.mockResolvedValue(false);

    await expect(
      useCase.execute({
        taxId: 'J-12345678-0',
        username: 'cajero1',
        password: 'wrong_password',
      }),
    ).rejects.toThrow('Usuario o contraseña incorrectos. Llevas 1 de 3 intentos.');

    expect(userToFail.failed_login_attempts).toBe(1);
  });

  it('should deactivate employee account when failed login attempts reach 3', async () => {
    const userToLock = new User({ ...mockEmployeeUser, failed_login_attempts: 2 });
    tenantRepository.findByTaxId.mockResolvedValue(mockTenant);
    userRepository.findByUsernameAndTenant.mockResolvedValue(userToLock);
    authService.comparePassword.mockResolvedValue(false);

    await expect(
      useCase.execute({
        taxId: 'J-12345678-0',
        username: 'cajero1',
        password: 'wrong_password',
      }),
    ).rejects.toThrow('Tu cuenta ha sido desactivada por alcanzar 3 intentos fallidos.');

    expect(userToLock.is_active).toBe(false);
    expect(userToLock.failed_login_attempts).toBe(3);
  });

  it('should throw UnauthorizedException if employee is inactive or deactivated', async () => {
    const inactiveUser = new User({ ...mockEmployeeUser, is_active: false });
    tenantRepository.findByTaxId.mockResolvedValue(mockTenant);
    userRepository.findByUsernameAndTenant.mockResolvedValue(inactiveUser);

    await expect(
      useCase.execute({
        taxId: 'J-12345678-0',
        username: 'cajero1',
        password: 'password123',
      }),
    ).rejects.toThrow('Tu cuenta se encuentra inactiva o desactivada por exceder intentos fallidos.');
  });
});
