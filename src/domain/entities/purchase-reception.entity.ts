import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

@Entity('purchase_reception_notes')
export class PurchaseReceptionNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenant_id!: string;

  @Column({ name: 'reception_number', type: 'varchar', length: 100 })
  reception_number!: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  order_id?: string;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplier_id?: string;

  @Column({ name: 'supplier_name', type: 'varchar', length: 255 })
  supplier_name!: string;

  @Column({ name: 'supplier_rif', type: 'varchar', length: 50, nullable: true })
  supplier_rif?: string;

  @Column({ name: 'ndr_number', type: 'varchar', length: 100, nullable: true })
  ndr_number?: string;

  @Column({ name: 'warehouse_name', type: 'varchar', length: 255, default: 'Almacén Principal' })
  warehouse_name!: string;

  @Column({ name: 'payment_term', type: 'varchar', length: 50, default: 'CONTADO' })
  payment_term!: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency!: string;

  @Column({ name: 'exchange_rate', type: 'numeric', precision: 12, scale: 4, default: 1.0000 })
  exchange_rate!: number;

  @Column({ name: 'is_national', type: 'boolean', default: true })
  is_national!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'RECEIVED' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'global_discount_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  global_discount_amount!: number;

  @Column({ name: 'global_surcharge_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  global_surcharge_amount!: number;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  created_by_user_id!: string;

  @Column({ name: 'created_by_user_name', type: 'varchar', length: 255, nullable: true })
  created_by_user_name?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @OneToMany(() => PurchaseReceptionItem, (item) => item.reception, { cascade: true })
  items!: PurchaseReceptionItem[];

  constructor(partial?: Partial<PurchaseReceptionNote>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

@Entity('purchase_reception_items')
export class PurchaseReceptionItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reception_id', type: 'uuid' })
  reception_id!: string;

  @Column({ name: 'item_number', type: 'integer', default: 1 })
  item_number!: number;

  @Column({ name: 'product_id', type: 'uuid' })
  product_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouse_id?: string;

  @Column({ name: 'quantity_received', type: 'numeric', precision: 12, scale: 4 })
  quantity_received!: number;

  @Column({ name: 'quantity_pending', type: 'numeric', precision: 12, scale: 4, default: 0 })
  quantity_pending!: number;

  @Column({ name: 'quantity_returned', type: 'numeric', precision: 12, scale: 4, default: 0 })
  quantity_returned!: number;

  @Column({ name: 'unit_cost_usd', type: 'numeric', precision: 12, scale: 4 })
  unit_cost_usd!: number;

  @Column({ name: 'discount_percentage', type: 'numeric', precision: 5, scale: 2, default: 0 })
  discount_percentage!: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  discount_amount!: number;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 16.00 })
  tax_rate!: number;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  tax_amount!: number;

  @Column({ name: 'net_total', type: 'numeric', precision: 12, scale: 4, default: 0 })
  net_total!: number;

  @Column({ name: 'additional_tax_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  additional_tax_amount!: number;

  @Column({ name: 'line_comment', type: 'text', nullable: true })
  line_comment?: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 100, nullable: true })
  batch_number?: string;

  @Column({ name: 'expiration_date', type: 'timestamp', nullable: true })
  expiration_date?: Date;

  @ManyToOne(() => PurchaseReceptionNote, (reception) => reception.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reception_id' })
  reception?: PurchaseReceptionNote;

  constructor(partial?: Partial<PurchaseReceptionItem>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

@Entity('purchase_reception_item_serials')
export class PurchaseReceptionItemSerial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reception_item_id', type: 'uuid' })
  reception_item_id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  product_id!: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100 })
  serial_number!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  constructor(partial?: Partial<PurchaseReceptionItemSerial>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
