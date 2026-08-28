import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ChangeInitialPasswordUseCase } from '../../../application/use-cases/auth/change-initial-password.use-case';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case';
import { LoginDto } from '../../../application/use-cases/auth/login.dto';
import { RegisterTenantUseCase } from '../../../application/use-cases/tenant/register-tenant.use-case';
import { RegisterTenantDto } from '../../../application/use-cases/tenant/register-tenant.dto';
import { ForgotPasswordUseCase } from '../../../application/use-cases/auth/forgot-password.use-case';
import { ForgotPasswordDto } from '../../../application/use-cases/auth/forgot-password.dto';
import { ResetPasswordUseCase } from '../../../application/use-cases/auth/reset-password.use-case';
import { ResetPasswordDto } from '../../../application/use-cases/auth/reset-password.dto';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case';
import { LogoutUseCase } from '../../../application/use-cases/auth/logout.use-case';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerTenantUseCase: RegisterTenantUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changeInitialPasswordUseCase: ChangeInitialPasswordUseCase,
  ) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check endpoint' })
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  private extractRefreshToken(req: Request): string | undefined {
    const bodyToken = req.body?.refresh_token;
    if (bodyToken) return bodyToken;

    const cookiesHeader = req.headers.cookie || '';
    if (!cookiesHeader) return undefined;
    const cookies = Object.fromEntries(
      cookiesHeader.split(';').map(c => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    return cookies['refresh_token'];
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 900000 } }) // Allow up to 20 requests per IP per 15 min; user-level 3 attempts logic handles account locking
  @ApiOperation({ summary: 'User login with automatic tenant resolution' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.loginUseCase.execute(loginDto);
    
    // Set HttpOnly refresh token cookie
    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching JWT expiration
    });

    return result;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new Tenant and OWNER user' })
  async register(@Body() registerDto: RegisterTenantDto) {
    return this.registerTenantUseCase.execute(registerDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // Limit password recovery requests too
  @ApiOperation({ summary: 'Request password recovery token' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using valid token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(resetPasswordDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh session tokens' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.extractRefreshToken(request);
    const result = await this.refreshTokenUseCase.execute(refreshToken);

    // Set new rotated HttpOnly refresh token cookie
    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching JWT expiration
    });

    // Remove refresh_token from body response
    const { refresh_token, ...rest } = result;
    return rest;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change initial temporary password' })
  async changePassword(
    @Req() req: any,
    @Body() body: { newPassword: string },
  ) {
    const userId = req.user?.sub || req.user?.id;
    return this.changeInitialPasswordUseCase.execute({
      userId,
      newPassword: body.newPassword,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user and revoke refresh token' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.extractRefreshToken(request);
    await this.logoutUseCase.execute(refreshToken);

    // Clear refresh_token cookie
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Logged out successfully' };
  }
}
