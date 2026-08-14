import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/typeorm/repositories/refresh-token.repository';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(rawToken: string | undefined): Promise<{ message: string }> {
    if (rawToken) {
      // Hash the raw token to locate it in the database
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenEntity = await this.refreshTokenRepository.findByHash(tokenHash);

      if (tokenEntity) {
        // Revoke the token by deleting it from the database
        await this.refreshTokenRepository.delete(tokenEntity.id);
      }
    }

    return {
      message: 'Logged out successfully',
    };
  }
}
