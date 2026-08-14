import { Test, TestingModule } from '@nestjs/testing';
import { LogoutUseCase } from './logout.use-case';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/typeorm/repositories/refresh-token.repository';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

  const mockToken = {
    id: 'token-uuid',
    user_id: 'user-1',
    token_hash: 'some_hash',
    expires_at: new Date(Date.now() + 1000 * 60 * 60),
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockRefreshTokenRepository = {
      findByHash: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        { provide: RefreshTokenRepository, useValue: mockRefreshTokenRepository },
      ],
    }).compile();

    useCase = module.get<LogoutUseCase>(LogoutUseCase);
    refreshTokenRepository = module.get<RefreshTokenRepository>(RefreshTokenRepository) as any;
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should successfully revoke token when token exists in database', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue(mockToken);
    refreshTokenRepository.delete.mockResolvedValue(undefined);

    const result = await useCase.execute('valid_raw_token');

    expect(result).toBeDefined();
    expect(result.message).toContain('Logged out successfully');
    expect(refreshTokenRepository.findByHash).toHaveBeenCalled();
    expect(refreshTokenRepository.delete).toHaveBeenCalledWith(mockToken.id);
  });

  it('should return successfully without deleting if token does not exist', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue(null);

    const result = await useCase.execute('invalid_raw_token');

    expect(result).toBeDefined();
    expect(result.message).toContain('Logged out successfully');
    expect(refreshTokenRepository.delete).not.toHaveBeenCalled();
  });

  it('should return successfully if rawToken is undefined', async () => {
    const result = await useCase.execute(undefined);

    expect(result).toBeDefined();
    expect(result.message).toContain('Logged out successfully');
    expect(refreshTokenRepository.findByHash).not.toHaveBeenCalled();
  });
});
