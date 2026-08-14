import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('saas_plans')
export class SaasPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthly_fee_usd: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  annual_fee_usd: number;

  @Column({ default: 10 })
  max_users: number;

  @Column({ default: 2500 })
  max_products: number;

  @Column({ default: 1 })
  max_warehouses: number;

  @Column({ default: false })
  has_fiscal_printing: boolean;

  @Column({ type: 'jsonb', default: [] })
  enabled_modules: string[];

  @Column({ type: 'jsonb', default: [] })
  enabled_permissions: string[];

  @Column({ type: 'jsonb', default: [] })
  features_list: string[];

  @Column({ nullable: true })
  badge_text: string;

  @Column({ default: false })
  is_featured: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  constructor(partial?: Partial<SaasPlan>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
