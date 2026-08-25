import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { TenantRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { RefreshTokenRepository } from '../../../infrastructure/persistence/typeorm/repositories/refresh-token.repository';
import { AuthService } from './auth.service';
import { RoleRepository } from '../../../infrastructure/persistence/typeorm/repositories/role.repository';
import { LoginDto } from './login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly authService: AuthService,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(loginDto: LoginDto): Promise<any> {
    const user = await this.userRepository.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Tu cuenta se encuentra inactiva o desactivada. Por favor comunícate con el Administrador para solicitar su activación.');
    }

    const isPasswordValid = await this.authService.comparePassword(
      loginDto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      user.failed_login_attempts = attempts;

      if (attempts >= 3) {
        user.is_active = false;
        await this.userRepository.save(user);
        throw new UnauthorizedException('Tu cuenta ha sido desactivada por alcanzar 3 intentos fallidos. Contacta al Administrador.');
      }

      await this.userRepository.save(user);
      const remaining = 3 - attempts;
      throw new UnauthorizedException(`Correo o contraseña incorrectos. Llevas ${attempts} de 3 intentos. Te qued${remaining === 1 ? 'a 1 intento' : `an ${remaining} intentos`}.`);
    }

    // Reset failed attempts counter on successful login
    if (user.failed_login_attempts > 0) {
      user.failed_login_attempts = 0;
      await this.userRepository.save(user);
    }

    // Resolve Tenant and enabled modules
    const tenant = await this.tenantRepository.findById(user.tenant_id);

    // Permitir el inicio de sesión para explorar la plataforma e ir a /settings/subscription
    const isTenantActive = tenant ? tenant.is_active : true;
    const isPlanActive = user.role === 'SUPER_ADMIN' ? true : (tenant ? Boolean(tenant.plan_is_active) : false);

    const tenantModules = tenant?.settings?.enabled_modules || ['POS', 'INVENTORY', 'SETTINGS', 'BANKS', 'PAYROLL']; // Default modules
    
    // Calculate trial days left
    const now = new Date();
    const expiresAt = tenant?.trial_expires_at ? new Date(tenant.trial_expires_at) : now;
    const diffTime = expiresAt.getTime() - now.getTime();
    const trialDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Resolve user's resolved permissions for the session (custom roles + overrides + tenant settings)
    let rolePermissions: string[] = [];
    if (user.role_id) {
      const role = await this.roleRepository.findById(user.role_id);
      if (role) {
        rolePermissions = role.allowed_permissions || [];
      }
    }

    const defaultOwnerPermissions = [
      'pos:create', 'sales:invoicing', 'sales:quotations', 'sales:orders', 'sales:deliveries', 'clients:manage', 'pos:shifts',
      'purchases:orders', 'purchases:receptions', 'purchases:new', 'purchases:invoices', 'providers:manage',
      'inventory:create', 'inventory:stock', 'inventory:bulk_prices', 'inventory:valuation', 'inventory:warehouse', 'inventory:categories', 'inventory:moves',
      'banks:accounts', 'accounts:receivables', 'accounts:payables', 'accounts:history',
      'reports:view',
      'company:manage', 'fiscal:manage', 'users:manage'
    ];

    const resolvedPermissions = user.role === 'SUPER_ADMIN'
      ? defaultOwnerPermissions
      : (user.allowed_permissions && user.allowed_permissions.length > 0)
        ? user.allowed_permissions
        : (user.role === 'OWNER')
          ? (tenant?.settings?.enabled_permissions || defaultOwnerPermissions)
          : rolePermissions;

    // Resolve enabled modules dynamically from resolved permissions
    const permissionToModuleMap: Record<string, string> = {
      'pos:create': 'POS',
      'sales:invoicing': 'POS',
      'sales:quotations': 'POS',
      'sales:orders': 'POS',
      'sales:deliveries': 'POS',
      'clients:manage': 'POS',
      'pos:shifts': 'POS',
      'purchases:orders': 'INVENTORY',
      'purchases:receptions': 'INVENTORY',
      'purchases:new': 'INVENTORY',
      'purchases:invoices': 'INVENTORY',
      'providers:manage': 'INVENTORY',
      'inventory:create': 'INVENTORY',
      'inventory:stock': 'INVENTORY',
      'inventory:bulk_prices': 'INVENTORY',
      'inventory:valuation': 'INVENTORY',
      'inventory:warehouse': 'INVENTORY',
      'inventory:categories': 'INVENTORY',
      'inventory:moves': 'INVENTORY',
      'banks:accounts': 'BANKS',
      'accounts:receivables': 'BANKS',
      'accounts:payables': 'BANKS',
      'accounts:history': 'BANKS',
      'payroll:manage': 'PAYROLL',
      'reports:view': 'REPORTS',
      'company:manage': 'SETTINGS',
      'fiscal:manage': 'SETTINGS',
      'users:manage': 'SETTINGS',
    };

    // SUPER_ADMIN gets unrestricted access to all platform modules
    let enabledModules = tenantModules;
    if (user.role === 'SUPER_ADMIN') {
      enabledModules = ['POS', 'SALES', 'INVENTORY', 'BANKS', 'REPORTS', 'PAYROLL', 'SETTINGS', 'ADMIN'];
    } else {
      const resolvedModules = new Set<string>();
      resolvedPermissions.forEach(perm => {
        const mod = permissionToModuleMap[perm];
        if (mod) resolvedModules.add(mod);
      });
      // Incluir también los módulos habilitados del tenant que coincidan con los permisos resueltos
      enabledModules = tenantModules.filter(mod => resolvedModules.has(mod));
      if (enabledModules.length === 0) {
        enabledModules = tenantModules;
      }
    }


    const accessToken = await this.authService.generateAccessToken(user, enabledModules, resolvedPermissions);
    const refreshToken = await this.authService.generateRefreshToken(user);

    // Save refresh token hash to database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const dbExpiresAt = new Date();
    dbExpiresAt.setDate(dbExpiresAt.getDate() + 7); // 7 days expiration matching JWT configuration

    await this.refreshTokenRepository.save({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: dbExpiresAt,
    });

    // Return tokens and user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: {
        ...userWithoutPassword,
        tenant_status: isTenantActive ? 'ACTIVE' : 'SUSPENDED',
        plan_is_active: isPlanActive,
        enabled_modules: enabledModules,
        permissions: resolvedPermissions,
        trial_days_left: trialDaysLeft,
        must_change_password: Boolean(user.is_temporary_password),
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
