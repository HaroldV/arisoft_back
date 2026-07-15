import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('purchase_fiscal_notes')
export class PurchaseFiscalNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  original_invoice_id: string;

  @Column({ type: 'varchar' })
  document_number: string;

  @Column({ type: 'varchar' })
  control_number: string;

  @Column({ type: 'varchar' })
  type: 'CREDIT' | 'DEBIT';

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'varchar' })
  reason_code: 'RETURN' | 'DISCOUNT' | 'PRICE_ERR' | 'TAX_ERR' | 'OTHER';

  @Column({ type: 'text', nullable: true })
  reason_description?: string;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  exchange_rate: number;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  subtotal_usd: number;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  tax_amount_usd: number;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  total_usd: number;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  subtotal_ves: number;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  tax_amount_ves: number;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  total_ves: number;

  @Column({ type: 'varchar' })
  status: 'POSTED' | 'CANCELLED';

  @CreateDateColumn()
  created_at: Date;

  constructor(partial: Partial<PurchaseFiscalNote>) {
    Object.assign(this, partial);
  }
}
