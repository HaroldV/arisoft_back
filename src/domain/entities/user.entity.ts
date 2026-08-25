import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique, ManyToOne, JoinColumn } from 'typeorm';

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
@Unique(['tenant_id', 'email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  full_name: string;

  @Column()
  email: string;

  @Column({ select: false }) // Hide password by default for security
  password_hash: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  role: string;

  @Column({ type: 'uuid', nullable: true })
  role_id?: string;

  @ManyToOne('Role', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id' })
  role_ref?: any;

  @Column({ type: 'uuid', nullable: true })
  creator_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ type: 'simple-array', nullable: true })
  allowed_modules: string[];

  @Column({ type: 'simple-array', nullable: true })
  allowed_permissions: string[];

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  failed_login_attempts: number;

  @Column({ type: 'boolean', default: false })
  is_temporary_password: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
