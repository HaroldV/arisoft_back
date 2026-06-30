import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './login.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { TenantRepository } from '../../../infrastructure/persistence/postgresql/repositories/tenant.repository';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/postgresql/repositories/refresh-token.repository';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let authService: jest.Mocked<AuthService>;
  let tenantRepository: jest.Mocked<TenantRepository>;

  const mockUser = new User({
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    is_active: true,
    role: UserRole.OWNER,
  });

  const mockTenant = {
    id: 'tenant-1',
    is_active: true,
    settings: {
      enabled_modules: ['POS', 'INVENTORY'],
    },
    trial_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    const mockAuthService = {
      comparePassword: jest.fn(),
      hashPassword: jest.fn(),
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };
    const mockTenantRepository = {
      findById: jest.fn().mockResolvedValue(mockTenant),
      save: jest.fn(),
    };
    const mockRefreshTokenRepository = {
      save: jest.fn().mockResolvedValue({} as any),
      findByHash: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: 'IUserRepository', useValue: mockUserRepository },
        { provide: TenantRepository, useValue: mockTenantRepository },
        { provide: RefreshTokenRepository, useValue: mockRefreshTokenRepository },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
    userRepository = module.get('IUserRepository');
    authService = module.get<AuthService>(AuthService) as any;
    tenantRepository = module.get<TenantRepository>(TenantRepository) as any;
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should login successfully with correct credentials', async () => {
    userRepository.findByEmail.mockResolvedValue(mockUser);
    authService.comparePassword.mockResolvedValue(true);
    authService.generateAccessToken.mockResolvedValue('access-token');
    authService.generateRefreshToken.mockResolvedValue('refresh-token');

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'correct_password',
    });

    expect(result).toBeDefined();
    expect(result.user.id).toBe(mockUser.id);
    expect(result.access_token).toBe('access-token');
    expect(result.refresh_token).toBe('refresh-token');
    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('should throw UnauthorizedException if user not found', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'wrong@example.com',
        password: 'any',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if password is incorrect', async () => {
    userRepository.findByEmail.mockResolvedValue(mockUser);
    authService.comparePassword.mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'wrong_password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    const inactiveUser = new User({ ...mockUser, is_active: false });
    userRepository.findByEmail.mockResolvedValue(inactiveUser);
    authService.comparePassword.mockResolvedValue(true);

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'correct_password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
