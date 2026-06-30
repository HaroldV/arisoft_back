import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../../../../domain/entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokenRepository: Repository<RefreshToken>,
  ) {}

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.tokenRepository.findOne({ where: { token_hash: tokenHash } });
  }

  async save(token: Partial<RefreshToken>): Promise<RefreshToken> {
    return this.tokenRepository.save(token);
  }

  async delete(id: string): Promise<void> {
    await this.tokenRepository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.tokenRepository.delete({ user_id: userId });
  }
}
