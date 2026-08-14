import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('sale_payments')
export class SalePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  sale_id: string;

  @Column({ type: 'varchar' })
  payment_method: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount_original: number;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  exchange_rate_applied: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount_usd: number;

  @Column({ type: 'varchar', nullable: true })
  transaction_reference?: string;

  @CreateDateColumn()
  created_at: Date;

  constructor(partial: Partial<SalePayment>) {
    Object.assign(this, partial);
  }
}
