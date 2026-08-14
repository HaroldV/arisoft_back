import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from '../../../../domain/entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,
  ) {}

  async deleteByEmail(email: string): Promise<void> {
    await this.tokenRepository.delete({ email });
  }

  async save(token: Partial<PasswordResetToken>): Promise<PasswordResetToken> {
    return this.tokenRepository.save(token);
  }

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.tokenRepository.findOne({ where: { token_hash: tokenHash } });
  }

  async delete(id: string): Promise<void> {
    await this.tokenRepository.delete(id);
  }
}
