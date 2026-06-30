import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/postgresql/repositories/refresh-token.repository';
import { TenantRepository } from '../../../infrastructure/persistence/postgresql/repositories/tenant.repository';
import { AuthService } from './auth.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(rawToken: string): Promise<any> {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;
    try {
      // 1. Verify the signature and validity of the refresh token
      payload = await this.authService.verifyToken(rawToken);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Hash the raw token to query the DB
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenEntity = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!tokenEntity) {
      // Replay attack or revoked token detection
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 3. Double check expiration from database
    const now = new Date();
    if (tokenEntity.expires_at < now) {
      await this.refreshTokenRepository.delete(tokenEntity.id);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 4. Retrieve the user
    const user = await this.userRepository.findById(tokenEntity.user_id);
    if (!user || !user.is_active) {
      await this.refreshTokenRepository.delete(tokenEntity.id);
      throw new UnauthorizedException('User not found or inactive');
    }

    // 5. Resolve Tenant and enabled modules
    const tenant = await this.tenantRepository.findById(user.tenant_id);
    const enabledModules = tenant?.settings?.enabled_modules || ['POS', 'INVENTORY'];

    // Calculate trial days left
    const expiresAtDate = tenant?.trial_expires_at ? new Date(tenant.trial_expires_at) : now;
    const diffTime = expiresAtDate.getTime() - now.getTime();
    const trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 6. Generate new access and refresh tokens (Rotation)
    const newAccessToken = await this.authService.generateAccessToken(user, enabledModules);
    const newRefreshToken = await this.authService.generateRefreshToken(user);

    // 7. Delete the old refresh token from database
    await this.refreshTokenRepository.delete(tokenEntity.id);

    // 8. Hash the new refresh token and persist it
    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const dbExpiresAt = new Date();
    dbExpiresAt.setDate(dbExpiresAt.getDate() + 7); // 7 days matching JWT expiration

    await this.refreshTokenRepository.save({
      user_id: user.id,
      token_hash: newHash,
      expires_at: dbExpiresAt,
    });

    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: {
        ...userWithoutPassword,
        enabled_modules: enabledModules,
        trial_days_left: trialDaysLeft,
      },
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }
}
