import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum PaymentMethod {
  CASH_BS = 'CASH_BS',
  DEBIT_BS = 'DEBIT_BS',
  CASH_USD = 'CASH_USD',
  TRANSFER_USD = 'TRANSFER_USD',
}

@Entity('account_payments')
export class AccountPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  account_id: string;

  @ManyToOne('AccountPayable', (account: any) => account.payments, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  payable_account?: any;

  @ManyToOne('AccountReceivable', (account: any) => account.payments, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  receivable_account?: any;

  @Column({ type: 'varchar', length: 30 })
  payment_method: PaymentMethod;

  @Column({ type: 'varchar', length: 5, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0000 })
  exchange_rate: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  amount_usd: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_number: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by_user_name?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  paid_at: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
