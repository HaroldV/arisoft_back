import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('fiscal_audit_logs')
export class FiscalAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar' })
  event_type: string;

  @Column({ type: 'uuid' })
  document_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'varchar' })
  ip_address: string;

  @Column({ type: 'varchar' })
  hash_checksum: string;

  constructor(partial: Partial<FiscalAuditLog>) {
    Object.assign(this, partial);
  }
}
