import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export const FiscalDocType = {
  INVOICE: 'INVOICE' as const,
  CREDIT_NOTE: 'CREDIT_NOTE' as const,
  DEBIT_NOTE: 'DEBIT_NOTE' as const,
};

@Entity('tenant_fiscal_ranges')
export class TenantFiscalRange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar' })
  type: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

  @Column({ type: 'integer' })
  start_number: number;

  @Column({ type: 'integer' })
  end_number: number;

  @Column({ type: 'integer' })
  current_number: number;

  @Column({ type: 'varchar' })
  authorization_number: string;

  @CreateDateColumn()
  created_at: Date;

  constructor(partial: Partial<TenantFiscalRange>) {
    Object.assign(this, partial);
  }
}
