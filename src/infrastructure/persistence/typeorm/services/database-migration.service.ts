import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AuthService } from '../../../../application/use-cases/auth/auth.service';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { User, UserRole } from '../../../../domain/entities/user.entity';
import { SchemaMigrationLock } from '../../../../domain/entities/schema-migration-lock.entity';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../../domain/constants/domain.constants';

@Injectable()
export class DatabaseMigrationService {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SchemaMigrationLock)
    private readonly migrationLockRepository: Repository<SchemaMigrationLock>,
  ) {}

  async runMigrationsAndBootstrap(): Promise<void> {
    try {
      const candidates = [
        path.join(process.cwd(), 'src', 'infrastructure', 'persistence', 'typeorm', 'migrations'),
        path.join(process.cwd(), 'dist', 'src', 'infrastructure', 'persistence', 'typeorm', 'migrations'),
        path.join(process.cwd(), 'dist', 'infrastructure', 'persistence', 'typeorm', 'migrations'),
      ];

      const migrationsDir = candidates.find(dir => fs.existsSync(dir));

      if (migrationsDir) {
        let executedLocks: SchemaMigrationLock[] = [];
        try {
          executedLocks = await this.migrationLockRepository.find();
        } catch {
          executedLocks = [];
        }

        const executedSet = new Set(executedLocks.map(r => r.filename));

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
              const queryRunner = this.dataSource.createQueryRunner();
              await queryRunner.connect();
              try {
                await queryRunner.query(sql);
              } finally {
                await queryRunner.release();
              }

              await this.migrationLockRepository.save(new SchemaMigrationLock({ filename: file }));
              this.logger.log(`🔒 Migration [${file}] applied and locked.`);
            } catch (err: any) {
              try {
                await this.migrationLockRepository.save(new SchemaMigrationLock({ filename: file }));
              } catch {
                // Ignore lock save failure on legacy DB state
              }
              this.logger.debug(`Notice executing migration [${file}]: ${err.message || err}`);
            }
          }
        }
      }

      // 2. Ensure system default tenant exists (Additive-only)
      const defaultTenantId = BACKEND_SYSTEM_CONSTANTS.DEFAULT_SYSTEM_TENANT_ID;
      const existingTenant = await this.tenantRepository.findOne({ where: { id: defaultTenantId } });
      
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
        await this.tenantRepository.save(systemTenant);
      }

      // 3. Ensure configured SuperAdmin user exists ONLY if missing
      const targetSuperAdminEmail = BACKEND_SYSTEM_CONSTANTS.SUPERADMIN_EMAIL.toLowerCase().trim();
      
      const existingSuperAdmin = await this.userRepository.findOne({
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
        await this.userRepository.save(newSuperAdmin);
        this.logger.log(`✅ SuperAdmin account created on first startup.`);
      }
    } catch (err) {
      this.logger.warn(`Notice running database initialization on startup: ${err}`);
    }
  }
}
