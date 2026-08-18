import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRateHistory } from '../../../../domain/entities/exchange-rate-history.entity';

@Injectable()
export class ExchangeRateHistoryRepository {
  constructor(
    @InjectRepository(ExchangeRateHistory)
    private readonly repo: Repository<ExchangeRateHistory>,
  ) {}

  async record(
    currency: 'USD' | 'EUR',
    rate: number,
    source: string,
    executionSlot?: string,
    valueDate?: string,
  ): Promise<ExchangeRateHistory> {
    const history = new ExchangeRateHistory({
      currency,
      rate,
      source,
      execution_slot: executionSlot || 'AUTO',
      value_date: valueDate,
    });
    return this.repo.save(history);
  }

  async findRecent(limit = 50): Promise<ExchangeRateHistory[]> {
    return this.repo.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
