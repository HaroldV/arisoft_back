import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case';
import { RegisterTenantUseCase } from '../../../application/use-cases/tenant/register-tenant.use-case';
import { ForgotPasswordUseCase } from '../../../application/use-cases/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../../application/use-cases/auth/reset-password.use-case';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case';
import { LogoutUseCase } from '../../../application/use-cases/auth/logout.use-case';
import { ChangeInitialPasswordUseCase } from '../../../application/use-cases/auth/change-initial-password.use-case';
import { Request, Response } from 'express';

describe('AuthController (Unit & Integration Tests)', () => {
  let controller: AuthController;
  let mockLoginUseCase: any;
  let mockRegisterTenantUseCase: any;
  let mockForgotPasswordUseCase: any;
  let mockResetPasswordUseCase: any;
  let mockRefreshTokenUseCase: any;
  let mockLogoutUseCase: any;
  let mockResponse: any;

  beforeEach(async () => {
    mockLoginUseCase = { execute: jest.fn() };
    mockRegisterTenantUseCase = { execute: jest.fn() };
    mockForgotPasswordUseCase = { execute: jest.fn() };
    mockResetPasswordUseCase = { execute: jest.fn() };
    mockRefreshTokenUseCase = { execute: jest.fn() };
    mockLogoutUseCase = { execute: jest.fn() };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginUseCase, useValue: mockLoginUseCase },
        { provide: RegisterTenantUseCase, useValue: mockRegisterTenantUseCase },
        { provide: ForgotPasswordUseCase, useValue: mockForgotPasswordUseCase },
        { provide: ResetPasswordUseCase, useValue: mockResetPasswordUseCase },
        { provide: RefreshTokenUseCase, useValue: mockRefreshTokenUseCase },
        { provide: LogoutUseCase, useValue: mockLogoutUseCase },
        { provide: ChangeInitialPasswordUseCase, useValue: { execute: jest.fn().mockResolvedValue({ success: true }) } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/login', () => {
    it('should authenticate user and set httpOnly cookie', async () => {
      const loginDto = { email: 'admin@test.com', password: 'Password123!' };
      const expectedResult = {
        user: { id: 'u-1', email: 'admin@test.com' },
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };
      mockLoginUseCase.execute.mockResolvedValue(expectedResult);

      const res = await controller.login(loginDto, mockResponse as Response);

      expect(mockLoginUseCase.execute).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.objectContaining({ httpOnly: true })
      );
      expect(res).toEqual(expectedResult);
    });
  });

  describe('POST /auth/register', () => {
    it('should register tenant and owner user', async () => {
      const dto = { companyName: 'Mi Empresa', taxId: 'J-12345678-9', ownerName: 'Carlos', email: 'carlos@test.com', password: 'Password123!' };
      const expected = { tenant: { id: 't-1' }, user: { id: 'u-1' } };
      mockRegisterTenantUseCase.execute.mockResolvedValue(expected);

      const res = await controller.register(dto as any);
      expect(mockRegisterTenantUseCase.execute).toHaveBeenCalledWith(dto);
      expect(res).toEqual(expected);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should trigger forgot password use case', async () => {
      const dto = { email: 'test@example.com' };
      const expected = { message: 'Reset token sent' };
      mockForgotPasswordUseCase.execute.mockResolvedValue(expected);

      const res = await controller.forgotPassword(dto);
      expect(mockForgotPasswordUseCase.execute).toHaveBeenCalledWith(dto);
      expect(res).toEqual(expected);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should trigger reset password use case', async () => {
      const dto = { token: 'valid-token', password: 'NewPassword123!' };
      const expected = { message: 'Password updated' };
      mockResetPasswordUseCase.execute.mockResolvedValue(expected);

      const res = await controller.resetPassword(dto);
      expect(mockResetPasswordUseCase.execute).toHaveBeenCalledWith(dto);
      expect(res).toEqual(expected);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens from request body if cookie is not present', async () => {
      const req = { body: { refresh_token: 'body-refresh-token' }, headers: {} } as Request;
      const refreshResult = { access_token: 'new-access-token', refresh_token: 'new-refresh-token', user: {} };
      mockRefreshTokenUseCase.execute.mockResolvedValue(refreshResult);

      const res = await controller.refresh(req, mockResponse as Response);

      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith('body-refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'new-refresh-token', expect.any(Object));
      expect(res).toEqual({ access_token: 'new-access-token', user: {} });
    });

    it('should refresh tokens from cookie if body does not have refresh_token', async () => {
      const req = { body: {}, headers: { cookie: 'refresh_token=cookie-refresh-token; other=val' } } as Request;
      const refreshResult = { access_token: 'new-access-token', refresh_token: 'new-refresh-token', user: {} };
      mockRefreshTokenUseCase.execute.mockResolvedValue(refreshResult);

      const res = await controller.refresh(req, mockResponse as Response);

      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith('cookie-refresh-token');
      expect(res).toEqual({ access_token: 'new-access-token', user: {} });
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke refresh token and clear cookie', async () => {
      const req = { body: { refresh_token: 'logout-token' }, headers: {} } as Request;
      mockLogoutUseCase.execute.mockResolvedValue(true);

      const res = await controller.logout(req, mockResponse as Response);

      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith('logout-token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(res).toEqual({ message: 'Logged out successfully' });
    });
  });
});
