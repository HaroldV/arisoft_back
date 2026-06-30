import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum StockMoveType {
  INITIAL_LOAD = 'INITIAL_LOAD',
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
}

@Entity('stocks')
export class StockMove {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: StockMoveType;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  cost_at_time: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source_type?: string;

  @Column({ type: 'uuid', nullable: true })
  source_id?: string;

  @Column({ type: 'text', nullable: true })
  justification?: string;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @CreateDateColumn()
  created_at: Date;

  constructor(partial: Partial<StockMove>) {
    Object.assign(this, partial);
  }
}
