import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CommercialDocumentItem } from './commercial-document-item.entity';

export enum CommercialDocumentType {
  QUOTATION = 'QUOTATION',
  SALES_ORDER = 'SALES_ORDER',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  INVOICED = 'INVOICED',
  CONVERTED = 'CONVERTED',
  CANCELLED = 'CANCELLED',
}

@Entity('commercial_documents')
export class CommercialDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 30 })
  document_type: CommercialDocumentType;

  @Column({ type: 'varchar', length: 100 })
  document_number: string;

  @Column({ type: 'uuid', nullable: true })
  source_document_id?: string;

  @Column({ type: 'uuid', nullable: true })
  client_id?: string;

  @Column({ type: 'varchar', length: 255 })
  client_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  client_tax_id?: string;

  @Column({ type: 'varchar', length: 30, default: DocumentStatus.DRAFT })
  status: DocumentStatus;

  @Column({ type: 'date', nullable: true })
  issue_date?: string;

  @Column({ type: 'date', nullable: true })
  valid_until?: string;

  @Column({ type: 'date', nullable: true })
  delivery_date?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method?: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  subtotal_usd: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  tax_usd: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  total_usd: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0000 })
  exchange_rate: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  total_bs: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  carrier_name?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehicle_plate?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  driver_name?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by_user_name?: string;

  @OneToMany(() => CommercialDocumentItem, (item) => item.document, { cascade: true })
  items?: CommercialDocumentItem[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
