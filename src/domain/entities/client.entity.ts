import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('clients')
@Unique(['tenant_id', 'tax_id'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  name: string;

  @Column()
  tax_id: string; // Cédula o RIF: V-12345678-9 or E-12345678 or J-12345678-9

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  delivery_address?: string;

  @Column({ default: 'DC' })
  zone_code: string;

  @Column({ default: 'EXEMPT' })
  taxpayer_type: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
