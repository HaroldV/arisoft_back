import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cash_shifts')
export class CashShift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  cashier_id: string;

  @Column({ type: 'varchar', default: 'OPEN' })
  status: string;

  @CreateDateColumn()
  opened_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at?: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.00 })
  opening_balance_usd: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.00 })
  opening_balance_ves: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.00 })
  declared_cash_usd: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.00 })
  declared_cash_ves: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.00 })
  expected_cash_usd: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.00 })
  expected_cash_ves: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.00 })
  discrepancy_usd: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.00 })
  discrepancy_ves: number;

  @Column({ type: 'uuid', nullable: true })
  approved_by_id?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  constructor(partial: Partial<CashShift>) {
    Object.assign(this, partial);
  }
}
