import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CommercialDocument } from './commercial-document.entity';

@Entity('commercial_document_items')
export class CommercialDocumentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  document_id: string;

  @ManyToOne(() => CommercialDocument, (doc) => doc.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document?: CommercialDocument;

  @Column({ type: 'uuid', nullable: true })
  product_id?: string;

  @Column({ type: 'varchar', length: 255 })
  product_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0.0000 })
  unit_price_usd: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 1.0000 })
  quantity: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  subtotal_usd: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  tax_usd: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0.00 })
  total_usd: number;
}
