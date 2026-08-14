import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';

@Entity('products')
@Unique(['tenant_id', 'sku'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  sku: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  cost_usd: number;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  price_usd: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 16.00 })
  tax_rate: number;

  @Column({ default: 'unidades' })
  unit_of_measure: string;

  @Column({ type: 'uuid', nullable: true })
  category_id: string | null;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ type: 'jsonb', default: '[]' })
  variations: any; // array of variation objects

  @Column({ type: 'jsonb', default: '{}' })
  advanced_fields: any; // advanced configuration object

  @Column({ type: 'varchar', length: 20, default: 'TAXABLE' })
  tax_type: string;

  @Column({ type: 'boolean', default: false })
  is_perishable: boolean;

  @Column({ type: 'boolean', default: false })
  has_batch_control: boolean;

  @Column({ type: 'text', nullable: true })
  image_url?: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by_user?: User;

  @Column({ type: 'uuid', nullable: true })
  updated_by_user_id?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by_user_id' })
  updated_by_user?: User;

  created_by_user_name?: string;
  updated_by_user_name?: string;

  current_stock?: number;

  // CamelCase properties for frontend serialization compatibility
  costUsd?: number;
  priceUsd?: number;
  imageUrl?: string;
  taxRate?: number;
  taxType?: string;
  isPerishable?: boolean;
  hasBatchControl?: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;

  constructor(partial?: Partial<Product>) {
    if (partial) {
      Object.assign(this, partial);
      this.costUsd = partial.cost_usd !== undefined ? Number(partial.cost_usd) : undefined;
      this.priceUsd = partial.price_usd !== undefined ? Number(partial.price_usd) : undefined;
      this.taxRate = partial.tax_rate !== undefined ? Number(partial.tax_rate) : undefined;
      this.taxType = partial.tax_type !== undefined ? partial.tax_type : undefined;
      this.isPerishable = partial.is_perishable !== undefined ? partial.is_perishable : undefined;
      this.hasBatchControl = partial.has_batch_control !== undefined ? partial.has_batch_control : undefined;
    }
  }
}
