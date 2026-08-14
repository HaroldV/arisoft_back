import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PeriodType {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
  RANGE = 'RANGE',
}

@Entity('stock_snapshots')
export class StockSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'date' })
  snapshot_date: string;

  @Column({ type: 'varchar', length: 20, default: PeriodType.DAILY })
  period_type: PeriodType;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'varchar', length: 255 })
  product_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category_name: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0.0000 })
  quantity_on_hand: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0.0000 })
  unit_cost_usd: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0.0000 })
  unit_price_usd: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0000 })
  exchange_rate: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  total_cost_usd: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  total_cost_bs: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  total_price_usd: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  total_price_bs: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by_user_name: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
