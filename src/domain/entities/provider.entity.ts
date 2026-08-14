import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('providers')
@Unique(['tenant_id', 'tax_id'])
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  name: string;

  @Column()
  tax_id: string; // RIF: J-12345678-9

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  delivery_address?: string;

  @Column({ default: 'DC' })
  zone_code: string;

  @Column({ default: 'ORDINARY' })
  taxpayer_type: string;

  @Column({ default: false })
  is_retention_agent: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 75.00 })
  retention_percentage: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 2.00 })
  islr_percentage: number;

  @Column({ type: 'varchar', length: 100, default: 'SERVICES' })
  islr_concept_code: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
