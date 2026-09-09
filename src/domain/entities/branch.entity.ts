import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { WarehouseLocation } from './warehouse-location.entity';

@Entity('branches')
@Unique(['tenant_id', 'code'])
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'uuid', nullable: true })
  default_warehouse_id?: string;

  @ManyToOne(() => WarehouseLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'default_warehouse_id' })
  default_warehouse?: WarehouseLocation;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_main: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  constructor(partial: Partial<Branch>) {
    Object.assign(this, partial);
  }
}
