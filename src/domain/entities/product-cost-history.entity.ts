import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('product_cost_history')
export class ProductCostHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenant_id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  product_id!: string;

  @Column({ name: 'old_cost_usd', type: 'numeric', precision: 12, scale: 4 })
  old_cost_usd!: number;

  @Column({ name: 'new_cost_usd', type: 'numeric', precision: 12, scale: 4 })
  new_cost_usd!: number;

  @Column({ name: 'source_type', type: 'varchar', length: 50 })
  source_type!: string;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  source_id?: string;

  @Column({ name: 'created_by_user_name', type: 'varchar', length: 255, nullable: true })
  created_by_user_name?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  constructor(partial?: Partial<ProductCostHistory>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
