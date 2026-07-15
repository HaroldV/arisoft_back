import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('purchase_fiscal_note_items')
export class PurchaseFiscalNoteItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  note_id: string;

  @Column({ type: 'uuid', nullable: true })
  product_id?: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  quantity: number;

  @Column({ type: 'numeric', precision: 15, scale: 4 })
  unit_price_usd: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  tax_rate: number;

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

  constructor(partial: Partial<PurchaseFiscalNoteItem>) {
    Object.assign(this, partial);
  }
}
