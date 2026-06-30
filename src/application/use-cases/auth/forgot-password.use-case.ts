import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { PasswordResetTokenRepository } from '../../../infrastructure/persistence/postgresql/repositories/password-reset-token.repository';
import { ForgotPasswordDto } from './forgot-password.dto';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: PasswordResetTokenRepository,
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User with this email was not found');
    }

    // 1. Delete previous tokens for this email to avoid bloating
    await this.tokenRepository.deleteByEmail(email);

    // 2. Generate secure raw token (UUID)
    const rawToken = crypto.randomUUID();

    // 3. Create SHA-256 hash of the token for database storage
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 4. Calculate expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // 5. Save the hash, email, and expiration time to the database
    await this.tokenRepository.save({
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    // 6. Print the reset link to the console (mock email delivery)
    const resetUrl = `http://localhost:3005/reset-password?token=${rawToken}`;
    console.log('\n==================================================');
    console.log(`🔑 PASSWORD RESET LINK REQUESTED`);
    console.log(`📧 To: ${email}`);
    console.log(`🔗 Link: ${resetUrl}`);
    console.log('==================================================\n');

    return {
      message: 'Password reset link has been printed to the console (mock email sent)',
    };
  }
}
