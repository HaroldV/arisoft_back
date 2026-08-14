import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PaymentMethodEnum {
  TRANSFER = 'TRANSFER',
  PAGO_MOVIL = 'PAGO_MOVIL',
  ZELLE = 'ZELLE',
}

export enum SubscriptionPaymentStatusEnum {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('subscription_payment_receipts')
export class SubscriptionPaymentReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  plan_code: string;

  @Column({ default: 'MONTHLY' })
  billing_cycle: 'MONTHLY' | 'ANNUAL';

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount_usd: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount_bcv_bs: number;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  bcv_rate_used: number;

  @Column({ type: 'varchar', length: 50 })
  payment_method: PaymentMethodEnum;

  @Column({ type: 'varchar', length: 100 })
  payment_reference: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_origin: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 50, default: SubscriptionPaymentStatusEnum.PENDING_APPROVAL })
  status: SubscriptionPaymentStatusEnum;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reviewed_by_user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
