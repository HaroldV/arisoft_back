import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../../domain/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUser = new User({
    id: 'user-1',
    email: 'test@example.com',
    tenant_id: 'tenant-1',
    role: UserRole.CASHIER,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate an access token with correct payload', async () => {
    const token = await service.generateAccessToken(mockUser);
    
    expect(token).toBe('mock-token');
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: mockUser.id,
      email: mockUser.email,
      tenant_id: mockUser.tenant_id,
      role: mockUser.role,
      enabled_modules: [],
    });
  });

  it('should generate a refresh token with correct payload', async () => {
    const token = await service.generateRefreshToken(mockUser);
    
    expect(token).toBe('mock-token');
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: mockUser.id,
        tenant_id: mockUser.tenant_id,
      },
      { expiresIn: '7d' },
    );
  });
});
