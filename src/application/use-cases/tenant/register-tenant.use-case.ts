import { Injectable, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RegisterTenantDto } from './register-tenant.dto';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class RegisterTenantUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
  ) {}

  /**
   * execute
   * Purpose: Handle Tenant registration with atomic transaction (T2.1.2)
   */
  async execute(dto: RegisterTenantDto) {
    const trialDays = 90;
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);

    const email = dto.email.toLowerCase().trim();
    const taxId = dto.taxId.toUpperCase().trim();

    return this.dataSource.transaction(async (manager) => {
      // 1. Validate Email & TaxID uniqueness (AC: #3)
      const existingTenant = await manager.findOne(Tenant, { where: { tax_id: taxId } });
      if (existingTenant) {
        throw new ConflictException(`Company with RIF ${taxId} is already registered`);
      }

      const existingUser = await manager.findOne(User, { where: { email } });
      if (existingUser) {
        throw new ConflictException(`User with email ${email} is already registered`);
      }

      // 2. Persist Tenant (AC: #1, #5)
      const tenant = new Tenant();
      tenant.company_name = dto.companyName;
      tenant.tax_id = taxId;
      tenant.plan_type = 'TRIAL_90';
      tenant.trial_expires_at = trialExpiresAt;
      tenant.settings = { enabled_modules: ['POS', 'INVENTORY'] };
      tenant.is_active = true; // Empresa activa en el sistema
      tenant.plan_is_active = false; // Sin plan comercial activo hasta comprarlo y ser aprobado

      const savedTenant = await manager.save(Tenant, tenant);

      // 3. Hash Password (AC: #4)
      const passwordHash = await this.authService.hashPassword(dto.password);

      // 4. Persist Owner User (AC: #1)
      const user = new User({
        tenant_id: savedTenant.id,
        full_name: dto.ownerName,
        email,
        password_hash: passwordHash,
        role: UserRole.OWNER,
        is_active: true,
      });

      const savedUser = await manager.save(User, user);

      const { password_hash, ...userWithoutPassword } = savedUser;

      return {
        message: 'Tenant and Owner successfully registered',
        tenant: savedTenant,
        user: userWithoutPassword,
      };
    });
  }
}
