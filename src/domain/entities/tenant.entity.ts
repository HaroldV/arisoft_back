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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
