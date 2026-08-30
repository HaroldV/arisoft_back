import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AuthService } from '../../../../application/use-cases/auth/auth.service';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { User, UserRole } from '../../../../domain/entities/user.entity';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../../domain/constants/domain.constants';

@Injectable()
export class DatabaseMigrationService {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
  ) {}

  async runMigrationsAndBootstrap(): Promise<void> {
    try {
      // 1. Ensure atomic migrations lock table exists
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations_lock (
          filename VARCHAR(255) PRIMARY KEY,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const candidates = [
        path.join(process.cwd(), 'src', 'infrastructure', 'persistence', 'typeorm', 'migrations'),
        path.join(process.cwd(), 'dist', 'src', 'infrastructure', 'persistence', 'typeorm', 'migrations'),
        path.join(process.cwd(), 'dist', 'infrastructure', 'persistence', 'typeorm', 'migrations'),
      ];

      const migrationsDir = candidates.find(dir => fs.existsSync(dir));

      if (migrationsDir) {
        const executedRows: { filename: string }[] = await this.dataSource.query(
          `SELECT filename FROM schema_migrations_lock;`
        );
        const executedSet = new Set(executedRows.map(r => r.filename));

        const files = fs.readdirSync(migrationsDir)
          .filter(f => f.endsWith('.sql'))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        for (const file of files) {
          if (executedSet.has(file)) {
            continue;
          }

          const filePath = path.join(migrationsDir, file);
          const sql = fs.readFileSync(filePath, 'utf8');
          if (sql && sql.trim().length > 0) {
            try {
              await this.dataSource.query(sql);
              await this.dataSource.query(
                `INSERT INTO schema_migrations_lock (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING;`,
                [file]
              );
              this.logger.log(`🔒 Migration [${file}] applied and locked.`);
            } catch (err) {
              this.logger.warn(`Notice executing migration [${file}]: ${err}`);
            }
          }
        }
      }

      // 2. Ensure system default tenant exists (Additive-only)
      const tenantRepository = this.dataSource.getRepository(Tenant);
      const defaultTenantId = BACKEND_SYSTEM_CONSTANTS.DEFAULT_SYSTEM_TENANT_ID;
      const existingTenant = await tenantRepository.findOne({ where: { id: defaultTenantId } });
      
      if (!existingTenant) {
        const systemTenant = new Tenant({
          id: defaultTenantId,
          company_name: 'ArivSoft System Administration',
          tax_id: 'J-00000000-0',
          plan_type: 'ENTERPRISE',
          trial_expires_at: new Date('2099-12-31'),
          is_active: true,
          plan_is_active: true,
        });
        await tenantRepository.save(systemTenant);
      }

      // 3. Ensure configured SuperAdmin user exists ONLY if missing
      const targetSuperAdminEmail = BACKEND_SYSTEM_CONSTANTS.SUPERADMIN_EMAIL.toLowerCase().trim();
      const userRepository = this.dataSource.getRepository(User);
      
      const existingSuperAdmin = await userRepository.findOne({
        where: [
          { email: targetSuperAdminEmail },
          { role: UserRole.SUPER_ADMIN }
        ]
      });

      if (!existingSuperAdmin) {
        const rawPassword = BACKEND_SYSTEM_CONSTANTS.DEFAULT_PASSWORD_ONBOARDING;
        const freshHash = await this.authService.hashPassword(rawPassword);
        const newSuperAdmin = new User({
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
          tenant_id: defaultTenantId,
          full_name: 'Super Admin',
          email: targetSuperAdminEmail,
          password_hash: freshHash,
          role: UserRole.SUPER_ADMIN,
          is_active: true,
          failed_login_attempts: 0,
          is_temporary_password: false,
        });
        await userRepository.save(newSuperAdmin);
        this.logger.log(`✅ SuperAdmin account created on first startup.`);
      }
    } catch (err) {
      this.logger.warn(`Notice running database initialization on startup: ${err}`);
    }
  }
}
