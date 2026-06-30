import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ForgotPasswordUseCase } from './forgot-password.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { PasswordResetTokenRepository } from '../../../infrastructure/persistence/postgresql/repositories/password-reset-token.repository';
import { User, UserRole } from '../../../domain/entities/user.entity';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let tokenRepository: jest.Mocked<PasswordResetTokenRepository>;

  const mockUser = new User({
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    is_active: true,
    role: UserRole.OWNER,
  });

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForgotPasswordUseCase,
        { provide: 'IUserRepository', useValue: mockUserRepository },
        { provide: PasswordResetTokenRepository, useValue: mockTokenRepository },
      ],
    }).compile();

    useCase = module.get<ForgotPasswordUseCase>(ForgotPasswordUseCase);
    userRepository = module.get('IUserRepository');
    tokenRepository = module.get<PasswordResetTokenRepository>(PasswordResetTokenRepository) as any;
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should execute successfully when email exists', async () => {
    userRepository.findByEmail.mockResolvedValue(mockUser);
    tokenRepository.deleteByEmail.mockResolvedValue(undefined);
    tokenRepository.save.mockResolvedValue({} as any);

    const result = await useCase.execute({ email: 'test@example.com' });

    expect(result).toBeDefined();
    expect(result.message).toContain('printed to the console');
    expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(tokenRepository.deleteByEmail).toHaveBeenCalledWith('test@example.com');
    expect(tokenRepository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException when user does not exist', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'unknown@example.com' }),
    ).rejects.toThrow(NotFoundException);
  });
});
