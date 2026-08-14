import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/typeorm/repositories/refresh-token.repository';
import { TenantRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { RoleRepository } from '../../../infrastructure/persistence/typeorm/repositories/role.repository';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let authService: jest.Mocked<AuthService>;

  const mockUser = new User({
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    is_active: true,
    role: UserRole.OWNER,
  });

  const mockToken = {
    id: 'token-uuid',
    user_id: 'user-1',
    token_hash: 'some_hash',
    expires_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
    created_at: new Date(),
  };

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
    const mockRefreshTokenRepository = {
      findByHash: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    };
    const mockTenantRepository = {
      findById: jest.fn().mockResolvedValue(mockTenant),
      save: jest.fn(),
    };
    const mockAuthService = {
      verifyToken: jest.fn(),
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    };
    const mockRoleRepository = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        { provide: 'IUserRepository', useValue: mockUserRepository },
        { provide: RefreshTokenRepository, useValue: mockRefreshTokenRepository },
        { provide: TenantRepository, useValue: mockTenantRepository },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoleRepository, useValue: mockRoleRepository },
      ],
    }).compile();

    useCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);
    userRepository = module.get('IUserRepository');
    refreshTokenRepository = module.get<RefreshTokenRepository>(RefreshTokenRepository) as any;
    tenantRepository = module.get<TenantRepository>(TenantRepository) as any;
    authService = module.get<AuthService>(AuthService) as any;
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should throw UnauthorizedException if rawToken is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    authService.verifyToken.mockRejectedValue(new Error('Invalid signature'));

    await expect(useCase.execute('invalid_raw_token')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token hash is not found in database', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'user-1' });
    refreshTokenRepository.findByHash.mockResolvedValue(null);

    await expect(useCase.execute('untracked_raw_token')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token in database has expired', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'user-1' });
    const expiredToken = {
      ...mockToken,
      expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
    };
    refreshTokenRepository.findByHash.mockResolvedValue(expiredToken);
    refreshTokenRepository.delete.mockResolvedValue(undefined);

    await expect(useCase.execute('expired_raw_token')).rejects.toThrow(UnauthorizedException);
    expect(refreshTokenRepository.delete).toHaveBeenCalledWith(expiredToken.id);
  });

  it('should rotate token successfully when validation succeeds', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'user-1' });
    refreshTokenRepository.findByHash.mockResolvedValue(mockToken);
    userRepository.findById.mockResolvedValue(mockUser);
    authService.generateAccessToken.mockResolvedValue('new-access-token');
    authService.generateRefreshToken.mockResolvedValue('new-refresh-token');
    refreshTokenRepository.delete.mockResolvedValue(undefined);
    refreshTokenRepository.save.mockResolvedValue({} as any);

    const result = await useCase.execute('valid_raw_token');

    expect(result).toBeDefined();
    expect(result.access_token).toBe('new-access-token');
    expect(result.refresh_token).toBe('new-refresh-token');
    expect(result.user.id).toBe(mockUser.id);
    expect(refreshTokenRepository.delete).toHaveBeenCalledWith(mockToken.id);
    expect(refreshTokenRepository.save).toHaveBeenCalled();
  });
});
