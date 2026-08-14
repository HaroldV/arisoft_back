import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_batches')
@Unique(['tenant_id', 'product_id', 'batch_number'])
export class ProductBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column()
  batch_number: string;

  @Column({ type: 'date', nullable: true })
  production_date?: string;

  @Column({ type: 'date', nullable: true })
  expiration_date?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  constructor(partial: Partial<ProductBatch>) {
    Object.assign(this, partial);
  }
}
