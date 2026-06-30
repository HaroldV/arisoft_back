import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { TenantRepository } from '../../../infrastructure/persistence/postgresql/repositories/tenant.repository';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/postgresql/repositories/refresh-token.repository';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(loginDto: LoginDto): Promise<any> {
    const user = await this.userRepository.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await this.authService.comparePassword(
      loginDto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Resolve Tenant and enabled modules
    const tenant = await this.tenantRepository.findById(user.tenant_id);
    const enabledModules = tenant?.settings?.enabled_modules || ['POS', 'INVENTORY']; // Default modules
    
    // Calculate trial days left
    const now = new Date();
    const expiresAt = tenant?.trial_expires_at ? new Date(tenant.trial_expires_at) : now;
    const diffTime = expiresAt.getTime() - now.getTime();
    const trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const accessToken = await this.authService.generateAccessToken(user, enabledModules);
    const refreshToken = await this.authService.generateRefreshToken(user);

    // Save refresh token hash to database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const dbExpiresAt = new Date();
    dbExpiresAt.setDate(dbExpiresAt.getDate() + 7); // 7 days expiration matching JWT configuration

    await this.refreshTokenRepository.save({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: dbExpiresAt,
    });

    // Return tokens and user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: {
        ...userWithoutPassword,
        enabled_modules: enabledModules,
        trial_days_left: trialDaysLeft,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
