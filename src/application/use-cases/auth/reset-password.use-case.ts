import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { PasswordResetTokenRepository } from '../../../infrastructure/persistence/typeorm/repositories/password-reset-token.repository';
import { AuthService } from './auth.service';
import { ResetPasswordDto } from './reset-password.dto';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: PasswordResetTokenRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<{ message: string }> {
    // 1. Hash the incoming raw token to find it in the DB
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const tokenEntity = await this.tokenRepository.findByHash(tokenHash);

    if (!tokenEntity) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // 2. Check if token has expired
    const now = new Date();
    if (tokenEntity.expires_at < now) {
      // Clean up the expired token
      await this.tokenRepository.delete(tokenEntity.id);
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // 3. Find the user associated with this token's email
    const user = await this.userRepository.findByEmail(tokenEntity.email);
    if (!user) {
      throw new NotFoundException('User associated with this token was not found or is inactive');
    }

    // 4. Hash the new password and update user entity
    const newPasswordHash = await this.authService.hashPassword(dto.password);
    user.password_hash = newPasswordHash;
    await this.userRepository.save(user);

    // 5. Invalidate the token by deleting it
    await this.tokenRepository.delete(tokenEntity.id);

    return {
      message: 'Password has been reset successfully',
    };
  }
}
