import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  total_amount_usd: number;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  exchange_rate_applied: number;

  @Column({ default: 'PAID' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  constructor(partial: Partial<Sale>) {
    Object.assign(this, partial);
  }
}
