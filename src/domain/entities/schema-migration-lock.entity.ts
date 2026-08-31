import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('schema_migrations_lock')
export class SchemaMigrationLock {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  filename!: string;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  executed_at!: Date;

  constructor(partial?: Partial<SchemaMigrationLock>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
