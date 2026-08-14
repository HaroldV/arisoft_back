import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { PasswordResetTokenRepository } from '../../../infrastructure/persistence/typeorm/repositories/password-reset-token.repository';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../../domain/entities/user.entity';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let tokenRepository: jest.Mocked<PasswordResetTokenRepository>;
  let authService: jest.Mocked<AuthService>;

  const mockUser = new User({
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'test@example.com',
    password_hash: 'old_hashed_password',
    is_active: true,
    role: UserRole.OWNER,
  });

  const mockToken = {
    id: 'token-uuid',
    email: 'test@example.com',
    token_hash: 'some_hash',
    expires_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    const mockTokenRepository = {
      deleteByEmail: jest.fn(),
      save: jest.fn(),
      findByHash: jest.fn(),
      delete: jest.fn(),
    };
    const mockAuthService = {
      hashPassword: jest.fn().mockResolvedValue('new_hashed_password'),
      comparePassword: jest.fn(),
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordUseCase,
        { provide: 'IUserRepository', useValue: mockUserRepository },
        { provide: PasswordResetTokenRepository, useValue: mockTokenRepository },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    useCase = module.get<ResetPasswordUseCase>(ResetPasswordUseCase);
    userRepository = module.get('IUserRepository');
    tokenRepository = module.get<PasswordResetTokenRepository>(PasswordResetTokenRepository) as any;
    authService = module.get<AuthService>(AuthService) as any;
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should reset password successfully when token is valid', async () => {
    tokenRepository.findByHash.mockResolvedValue(mockToken);
    userRepository.findByEmail.mockResolvedValue(mockUser);
    userRepository.save.mockResolvedValue(mockUser);
    tokenRepository.delete.mockResolvedValue(undefined);

    const result = await useCase.execute({
      token: 'raw_token',
      password: 'newPassword123!',
    });

    expect(result).toBeDefined();
    expect(result.message).toContain('successfully');
    expect(authService.hashPassword).toHaveBeenCalledWith('newPassword123!');
    expect(userRepository.save).toHaveBeenCalled();
    expect(tokenRepository.delete).toHaveBeenCalledWith(mockToken.id);
  });

  it('should throw BadRequestException when token is not found', async () => {
    tokenRepository.findByHash.mockResolvedValue(null);

    await expect(
      useCase.execute({
        token: 'invalid_token',
        password: 'newPassword123!',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException and delete token when token has expired', async () => {
    const expiredToken = {
      ...mockToken,
      expires_at: new Date(Date.now() - 1000 * 60), // Expired 1 min ago
    };
    tokenRepository.findByHash.mockResolvedValue(expiredToken);
    tokenRepository.delete.mockResolvedValue(undefined);

    await expect(
      useCase.execute({
        token: 'expired_token',
        password: 'newPassword123!',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(tokenRepository.delete).toHaveBeenCalledWith(expiredToken.id);
  });

  it('should throw NotFoundException when user is not found or inactive', async () => {
    tokenRepository.findByHash.mockResolvedValue(mockToken);
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        token: 'valid_token',
        password: 'newPassword123!',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
