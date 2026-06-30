import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Unique } from 'typeorm';

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

  current_stock?: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;

  constructor(partial: Partial<Product>) {
    Object.assign(this, partial);
  }
}
