import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Unique } from 'typeorm';

@Entity('purchase_invoices')
@Unique(['tenant_id', 'invoice_number', 'supplier_name'])
export class PurchaseInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  invoice_number: string;

  @Column()
  supplier_name: string;

  @Column({ type: 'uuid', nullable: true })
  provider_id?: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  total_amount_usd: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  discount_percentage: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0 })
  discount_amount_usd: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  proof_file_path?: string;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;

  constructor(partial: Partial<PurchaseInvoice>) {
    Object.assign(this, partial);
  }
}
