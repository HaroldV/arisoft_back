import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('exchange_rate_history')
@Index('idx_exchange_rate_history_curr_date', ['currency', 'created_at'])
export class ExchangeRateHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  currency: string; // 'USD' | 'EUR'

  @Column({ type: 'numeric', precision: 14, scale: 4 })
  rate: number;

  @Column({ length: 50 })
  source: string; // 'AUTO_SCRAPING' | 'MANUAL' | 'INITIAL_SEED'

  @Column({ length: 50, nullable: true })
  execution_slot?: string; // 'MORNING' | 'EVENING' | 'MANUAL_OVERRIDE'

  @Column({ length: 50, nullable: true })
  value_date?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  constructor(partial?: Partial<ExchangeRateHistory>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
