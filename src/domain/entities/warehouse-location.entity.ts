import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

export enum LocationType {
  WAREHOUSE = 'WAREHOUSE',
  AISLE = 'AISLE',
  SHELF = 'SHELF',
  BIN = 'BIN',
}

@Entity('warehouse_location')
export class WarehouseLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id?: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: LocationType;

  @Column({ type: 'integer', default: 0 })
  capacity_limit: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => WarehouseLocation, (location) => location.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: WarehouseLocation;

  @OneToMany(() => WarehouseLocation, (location) => location.parent)
  children?: WarehouseLocation[];

  constructor(partial: Partial<WarehouseLocation>) {
    Object.assign(this, partial);
  }
}
