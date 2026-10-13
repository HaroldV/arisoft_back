import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserRole } from '../../../domain/entities/user.entity';
import { TenantRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/typeorm/repositories/refresh-token.repository';
import { AuthService } from './auth.service';
import { RoleRepository } from '../../../infrastructure/persistence/typeorm/repositories/role.repository';
import { EmployeeLoginDto } from './employee-login.dto';

@Injectable()
export class EmployeeLoginUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly authService: AuthService,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(dto: EmployeeLoginDto): Promise<any> {
    const cleanTaxId = dto.taxId.toUpperCase().trim();
    const cleanUsername = dto.username.toLowerCase().trim();

    // 1. Resolver la empresa por RIF
    const tenant = await this.tenantRepository.findByTaxId(cleanTaxId);
    if (!tenant) {
      throw new UnauthorizedException('Empresa no encontrada con el RIF especificado');
    }

    // 2. Buscar al usuario en la empresa por username
    const user = await this.userRepository.findByUsernameAndTenant(cleanUsername, tenant.id);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas para esta empresa');
    }

    // 3. Validar si la cuenta está activa
    if (!user.is_active) {
      throw new UnauthorizedException(
        'Tu cuenta se encuentra inactiva o desactivada por exceder intentos fallidos. Comunícate con el Administrador o Propietario de la empresa para habilitarla.'
      );
    }

    // 4. Comparar contraseña con protección de 3 intentos
    const isPasswordValid = await this.authService.comparePassword(
      dto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      user.failed_login_attempts = attempts;

      if (attempts >= 3) {
        user.is_active = false;
        await this.userRepository.save(user);
        throw new UnauthorizedException(
          'Tu cuenta ha sido desactivada por alcanzar 3 intentos fallidos. Contacta al Administrador de tu empresa para reactivarla.'
        );
      }

      await this.userRepository.save(user);
      const remaining = 3 - attempts;
      throw new UnauthorizedException(
        `Usuario o contraseña incorrectos. Llevas ${attempts} de 3 intentos. Te qued${remaining === 1 ? 'a 1 intento' : `an ${remaining} intentos`}.`
      );
    }

    // 5. Restablecer intentos fallidos tras login exitoso
    if (user.failed_login_attempts > 0) {
      user.failed_login_attempts = 0;
      await this.userRepository.save(user);
    }

    // 6. Resolver estado comercial y módulos del Tenant
    const isTenantActive = tenant.is_active;
    const isPlanActive = Boolean(tenant.plan_is_active);
    const tenantModules = tenant.settings?.enabled_modules || ['POS', 'SALES', 'INVENTORY'];

    // 7. Resolver permisos del usuario (rol asignado + permisos explícitos)
    let rolePermissions: string[] = [];
    if (user.role_id) {
      const role = await this.roleRepository.findById(user.role_id);
      if (role) {
        rolePermissions = role.allowed_permissions || [];
      }
    }

    const resolvedPermissions = (user.allowed_permissions && user.allowed_permissions.length > 0)
      ? user.allowed_permissions
      : (rolePermissions && rolePermissions.length > 0)
        ? rolePermissions
        : [];

    // Mapeo de permisos a módulos
    const permissionToModuleMap: Record<string, string> = {
      'pos:create': 'POS',
      'sales:invoicing': 'POS',
      'clients:manage': 'POS',
      'pos:shifts': 'POS',
      'sales:quotations': 'SALES',
      'sales:orders': 'SALES',
      'sales:deliveries': 'SALES',
      'purchases:orders': 'INVENTORY_PURCHASES',
      'purchases:receptions': 'INVENTORY_PURCHASES',
      'purchases:new': 'INVENTORY_PURCHASES',
      'purchases:invoices': 'INVENTORY_PURCHASES',
      'providers:manage': 'INVENTORY_PURCHASES',
      'inventory:create': 'INVENTORY',
      'inventory:stock': 'INVENTORY',
      'inventory:view': 'INVENTORY',
      'inventory:write': 'INVENTORY',
      'inventory:adjust': 'INVENTORY',
      'inventory:bulk_prices': 'INVENTORY',
      'inventory:valuation': 'INVENTORY',
      'inventory:warehouse': 'INVENTORY',
      'inventory:categories': 'INVENTORY',
      'inventory:moves': 'INVENTORY',
      'banks:accounts': 'BANKS',
      'banks:ledger': 'BANKS',
      'banks:shifts': 'BANKS',
      'accounts:receivables': 'BANKS',
      'accounts:payables': 'BANKS',
      'accounts:history': 'BANKS',
      'payroll:manage': 'PAYROLL',
      'reports:view': 'REPORTS',
      'company:manage': 'SETTINGS',
      'fiscal:manage': 'SETTINGS',
      'users:manage': 'SETTINGS',
      'branches:manage': 'SETTINGS',
    };

    const resolvedModules = new Set<string>();
    resolvedPermissions.forEach((perm) => {
      const mod = permissionToModuleMap[perm];
      if (mod) resolvedModules.add(mod);
    });

    let enabledModules = tenantModules.filter((mod) => resolvedModules.has(mod));
    if (enabledModules.length === 0) {
      enabledModules = user.allowed_modules || tenantModules;
    }

    // 8. Generar tokens JWT y sesión
    const accessToken = await this.authService.generateAccessToken(user, enabledModules, resolvedPermissions);
    const refreshToken = await this.authService.generateRefreshToken(user);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const dbExpiresAt = new Date();
    dbExpiresAt.setDate(dbExpiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: dbExpiresAt,
    });

    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: {
        ...userWithoutPassword,
        tenant_status: isTenantActive ? 'ACTIVE' : 'SUSPENDED',
        plan_is_active: isPlanActive,
        enabled_modules: enabledModules,
        permissions: resolvedPermissions,
        trial_days_left: 0,
        must_change_password: Boolean(user.is_temporary_password),
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
