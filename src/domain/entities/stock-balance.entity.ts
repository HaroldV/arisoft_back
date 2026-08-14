import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { WarehouseLocation } from './warehouse-location.entity';
import { Product } from './product.entity';
import { ProductBatch } from './product-batch.entity';

@Entity('stock_balances')
@Unique(['tenant_id', 'location_id', 'product_id', 'batch_id'])
export class StockBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  location_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  batch_id?: string;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0.0000 })
  quantity: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => WarehouseLocation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location?: WarehouseLocation;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => ProductBatch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch?: ProductBatch;

  constructor(partial: Partial<StockBalance>) {
    Object.assign(this, partial);
  }
}
