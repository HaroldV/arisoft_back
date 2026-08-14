import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('bank_movements')
export class BankMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  account_id: string;

  @Column()
  type: string; // 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT'

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  amount: number;

  @Column({ nullable: true })
  reference?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @CreateDateColumn()
  created_at: Date;

  constructor(partial?: Partial<BankMovement>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
