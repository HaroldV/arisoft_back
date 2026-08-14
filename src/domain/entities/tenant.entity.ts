import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  company_name: string;

  @Column({ unique: true })
  tax_id: string;

  @Column({ default: 'TRIAL_90' })
  plan_type: string;

  @Column({ type: 'timestamp' })
  trial_expires_at: Date;

  @Column({ type: 'jsonb', default: {} })
  settings: any;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  plan_is_active: boolean;

  @Column({ nullable: true })
  commercial_name: string;

  @Column({ type: 'text', nullable: true })
  fiscal_address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: 'ORDINARY' })
  taxpayer_type: 'ORDINARY' | 'SPECIAL' | 'FORMAL';

  @Column({ default: false })
  is_withholding_agent: boolean;

  @Column({ type: 'text', nullable: true })
  logo_url: string;

  @Column({ type: 'text', nullable: true })
  receipt_footer: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  constructor(partial?: Partial<Tenant>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
