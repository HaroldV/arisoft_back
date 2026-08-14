import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  name: string;

  @Column()
  bank_name: string;

  @Column({ nullable: true })
  account_number?: string;

  @Column()
  account_type: string; // 'CORRIENTE', 'AHORRO', 'EFECTIVO'

  @Column()
  currency: string; // 'USD', 'VES'

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0.0000 })
  current_balance: number;

  @Column({ nullable: true })
  p2p_phone?: string;

  @Column({ nullable: true })
  p2p_tax_id?: string;

  @Column({ nullable: true })
  p2p_bank_code?: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
