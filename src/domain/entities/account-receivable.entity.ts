import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AccountPayment } from './account-payment.entity';

export enum AccountStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

@Entity('accounts_receivable')
export class AccountReceivable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', nullable: true })
  client_id?: string;

  @Column({ type: 'varchar', length: 255 })
  client_name: string;

  @Column({ type: 'uuid', nullable: true })
  reference_document_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_document_number?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_date?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  previous_balance: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  period_amount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  total_paid: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  balance_due: number;

  @Column({ type: 'varchar', length: 20, default: AccountStatus.PENDING })
  status: AccountStatus;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by_user_name?: string;

  @OneToMany(() => AccountPayment, (payment) => payment.receivable_account, { cascade: true })
  payments?: AccountPayment[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
