import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_components')
@Unique(['tenant_id', 'parent_product_id', 'child_product_id'])
export class ProductComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  parent_product_id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_product_id' })
  parent_product?: Product;

  @Column({ type: 'uuid' })
  child_product_id: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'child_product_id' })
  child_product?: Product;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 1.0000 })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0.0000 })
  unit_cost_at_definition: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  constructor(partial?: Partial<ProductComponent>) {
    if (partial) {
      Object.assign(this, partial);
      if (partial.quantity !== undefined) {
        this.quantity = Number(partial.quantity);
      }
      if (partial.unit_cost_at_definition !== undefined) {
        this.unit_cost_at_definition = Number(partial.unit_cost_at_definition);
      }
    }
  }
}
