import { ChangeInitialPasswordUseCase } from './change-initial-password.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { AuthService } from './auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';

describe('ChangeInitialPasswordUseCase (TDD Test Suite)', () => {
  let useCase: ChangeInitialPasswordUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
    } as any;

    mockAuthService = {
      hashPassword: jest.fn().mockResolvedValue('hashed_new_password_123'),
      comparePassword: jest.fn(),
    } as any;

    useCase = new ChangeInitialPasswordUseCase(mockUserRepository, mockAuthService);
  });

  it('should throw BadRequestException if password is less than 8 characters', async () => {
    await expect(
      useCase.execute({ userId: 'usr-1', newPassword: '123' })
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw UnauthorizedException if user is not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'invalid-id', newPassword: 'ValidPassword123!' })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should successfully update user password hash, set is_temporary_password to false, and reset failed attempts', async () => {
    const mockUser = new User({
      id: 'usr-1',
      email: 'user@ari.com',
      password_hash: 'old_hash',
      is_temporary_password: true,
      failed_login_attempts: 2,
    });

    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockUserRepository.save.mockResolvedValue({
      ...mockUser,
      password_hash: 'hashed_new_password_123',
      is_temporary_password: false,
      failed_login_attempts: 0,
    } as User);

    const result = await useCase.execute({
      userId: 'usr-1',
      newPassword: 'ValidPassword123!',
    });

    expect(mockAuthService.hashPassword).toHaveBeenCalledWith('ValidPassword123!');
    expect(mockUserRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        password_hash: 'hashed_new_password_123',
        is_temporary_password: false,
        failed_login_attempts: 0,
      })
    );
    expect(result.success).toBe(true);
  });
});
