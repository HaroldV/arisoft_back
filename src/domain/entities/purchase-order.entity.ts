import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenant_id!: string;

  @Column({ name: 'order_number', type: 'varchar', length: 100 })
  order_number!: string;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplier_id?: string;

  @Column({ name: 'supplier_name', type: 'varchar', length: 255 })
  supplier_name!: string;

  @Column({ name: 'supplier_rif', type: 'varchar', length: 50, nullable: true })
  supplier_rif?: string;

  @Column({ name: 'payment_term', type: 'varchar', length: 50, default: 'CONTADO' })
  payment_term!: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency!: string;

  @Column({ name: 'exchange_rate', type: 'numeric', precision: 12, scale: 4, default: 1.0000 })
  exchange_rate!: number;

  @Column({ name: 'is_national', type: 'boolean', default: true })
  is_national!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'DRAFT' })
  status!: PurchaseOrderStatus;

  @Column({ name: 'expected_date', type: 'timestamp', nullable: true })
  expected_date?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'subtotal_usd', type: 'numeric', precision: 12, scale: 4, default: 0 })
  subtotal_usd!: number;

  @Column({ name: 'global_discount_percentage', type: 'numeric', precision: 5, scale: 2, default: 0 })
  global_discount_percentage!: number;

  @Column({ name: 'global_discount_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  global_discount_amount!: number;

  @Column({ name: 'global_surcharge_percentage', type: 'numeric', precision: 5, scale: 2, default: 0 })
  global_surcharge_percentage!: number;

  @Column({ name: 'global_surcharge_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  global_surcharge_amount!: number;

  @Column({ name: 'tax_usd', type: 'numeric', precision: 12, scale: 4, default: 0 })
  tax_usd!: number;

  @Column({ name: 'total_usd', type: 'numeric', precision: 12, scale: 4, default: 0 })
  total_usd!: number;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  created_by_user_id!: string;

  @Column({ name: 'created_by_user_name', type: 'varchar', length: 255, nullable: true })
  created_by_user_name?: string;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellation_reason?: string;

  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelled_at?: Date;

  @Column({ name: 'cancelled_by_user_id', type: 'uuid', nullable: true })
  cancelled_by_user_id?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @OneToMany(() => PurchaseOrderItem, (item) => item.order, { cascade: true })
  items!: PurchaseOrderItem[];

  constructor(partial?: Partial<PurchaseOrder>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

  @Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  order_id!: string;

  @ManyToOne(() => PurchaseOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: PurchaseOrder;

  @Column({ name: 'item_number', type: 'integer', default: 1 })
  item_number!: number;

  @Column({ name: 'product_id', type: 'uuid' })
  product_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouse_id?: string;

  @Column({ name: 'quantity_ordered', type: 'numeric', precision: 12, scale: 4 })
  quantity_ordered!: number;

  @Column({ name: 'quantity_received', type: 'numeric', precision: 12, scale: 4, default: 0 })
  quantity_received!: number;

  @Column({ name: 'unit_cost_usd', type: 'numeric', precision: 12, scale: 4 })
  unit_cost_usd!: number;

  @Column({ name: 'discount_percentage', type: 'numeric', precision: 5, scale: 2, default: 0 })
  discount_percentage!: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  discount_amount!: number;

  @Column({ name: 'tax_type', type: 'varchar', length: 20, default: 'TAXABLE' })
  tax_type!: string;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 16.00 })
  tax_rate!: number;

  @Column({ name: 'additional_tax_amount', type: 'numeric', precision: 12, scale: 4, default: 0 })
  additional_tax_amount!: number;

  @Column({ name: 'total_cost_usd', type: 'numeric', precision: 12, scale: 4 })
  total_cost_usd!: number;

  @Column({ name: 'line_comment', type: 'text', nullable: true })
  line_comment?: string;

  constructor(partial?: Partial<PurchaseOrderItem>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
