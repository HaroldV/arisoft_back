import { Injectable, Inject, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { TenantRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { BACKEND_SYSTEM_CONSTANTS, PLAN_DEFAULT_MODULES, PLAN_DEFAULT_PERMISSIONS, SaasPlanEnum } from '../../../domain/constants/domain.constants';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(
    creator: { id: string; role: string; tenant_id: string; enabled_modules: string[]; permissions: string[] },
    dto: CreateUserDto,
  ): Promise<any> {
    // 1. Validate creator role (only OWNER and MANAGER can create users)
    if (creator.role !== UserRole.OWNER && creator.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Only owners and managers can register users');
    }

    // 2. Validate hierarchy (MANAGER cannot create OWNER)
    if (creator.role === UserRole.MANAGER && dto.role === UserRole.OWNER) {
      throw new ForbiddenException('Managers cannot create Owner users');
    }

    const email = dto.email.toLowerCase().trim();

    // 3. Validate uniqueness
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(`User with email ${email} is already registered`);
    }

    const tenant = await this.tenantRepository.findById(creator.tenant_id);
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // 4. Validate Plan User Quota Limit (STORY-UM-04)
    const currentUsers = await this.userRepository.findAllByTenant(creator.tenant_id);
    const planCode = (tenant.plan_type as SaasPlanEnum) || SaasPlanEnum.COMERCIAL_PRO;
    const defaultPlanLimits = BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS[planCode] || BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS.COMERCIAL_PRO;
    const maxUsersAllowed = tenant.settings?.max_users !== undefined 
      ? Number(tenant.settings.max_users) 
      : defaultPlanLimits.USERS;

    if (currentUsers.length >= maxUsersAllowed) {
      throw new ForbiddenException(
        `Has alcanzado el límite máximo de usuarios permitidos en tu suscripción (${currentUsers.length} de ${maxUsersAllowed}). Actualiza tu plan para registrar más usuarios.`
      );
    }

    // 5. Validate modules delegation limits
    const permissionToModuleMap: Record<string, string> = {
      'pos:create': 'POS',
      'sales:invoicing': 'POS',
      'sales:quotations': 'SALES',
      'sales:orders': 'SALES',
      'sales:deliveries': 'SALES',
      'clients:manage': 'POS',
      'pos:shifts': 'POS',
      'pos:discount': 'POS',
      'pos:refund': 'POS',
      'purchases:new': 'INVENTORY_PURCHASES',
      'purchases:orders': 'INVENTORY_PURCHASES',
      'purchases:receptions': 'INVENTORY_PURCHASES',
      'purchases:invoices': 'INVENTORY_PURCHASES',
      'purchases:register': 'INVENTORY_PURCHASES',
      'providers:manage': 'INVENTORY_PURCHASES',
      'inventory:create': 'INVENTORY',
      'inventory:view': 'INVENTORY',
      'inventory:write': 'INVENTORY',
      'inventory:stock': 'INVENTORY',
      'inventory:bulk_prices': 'INVENTORY',
      'inventory:valuation': 'INVENTORY',
      'inventory:warehouse': 'INVENTORY',
      'inventory:categories': 'INVENTORY',
      'inventory:moves': 'INVENTORY',
      'inventory:adjust': 'INVENTORY',
      'banks:accounts': 'BANKS',
      'banks:view': 'BANKS',
      'banks:write': 'BANKS',
      'banks:transfer': 'BANKS',
      'accounts:receivables': 'BANKS',
      'accounts:payables': 'BANKS',
      'accounts:history': 'BANKS',
      'payroll:manage': 'PAYROLL',
      'reports:view': 'REPORTS',
      'company:manage': 'SETTINGS',
      'fiscal:manage': 'SETTINGS',
      'users:manage': 'SETTINGS',
    };

    if ((!dto.allowed_modules || dto.allowed_modules.length === 0) && dto.allowed_permissions) {
      const resolvedMods = new Set<string>();
      dto.allowed_permissions.forEach(perm => {
        const mod = permissionToModuleMap[perm];
        if (mod) resolvedMods.add(mod);
      });
      dto.allowed_modules = Array.from(resolvedMods) as any[];
    }

    const defaultPlanModules = PLAN_DEFAULT_MODULES[planCode] || PLAN_DEFAULT_MODULES[SaasPlanEnum.COMERCIAL_PRO];
    const defaultPlanPermissions = PLAN_DEFAULT_PERMISSIONS[planCode] || PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.COMERCIAL_PRO];
    
    const tenantModules = tenant.settings?.enabled_modules || defaultPlanModules;
    const tenantPermissions = tenant.settings?.enabled_permissions || defaultPlanPermissions;
    
    // Limits of creator's modules
    const creatorAllowedModules = creator.role === UserRole.OWNER 
      ? tenantModules 
      : creator.enabled_modules || [];

    // Verify all requested modules are within creator limits
    const invalidModules = dto.allowed_modules.filter(mod => !creatorAllowedModules.includes(mod));
    if (invalidModules.length > 0) {
      throw new BadRequestException(
        `Cannot delegate access to modules: ${invalidModules.join(', ')}. You do not have access to these modules.`
      );
    }

    // Limits of creator's permissions
    const creatorAllowedPermissions = creator.role === UserRole.OWNER
      ? tenantPermissions
      : creator.permissions || [];

    // Verify all requested permissions are within creator limits
    const invalidPermissions = dto.allowed_permissions.filter(perm => !creatorAllowedPermissions.includes(perm));
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Cannot delegate access to permissions: ${invalidPermissions.join(', ')}. You do not have access to these permissions.`
      );
    }

    // 5. Hash password
    const passwordHash = await this.authService.hashPassword(dto.password);

    // 6. Create entity
    const newUser = new User({
      tenant_id: creator.tenant_id,
      full_name: dto.full_name,
      email,
      password_hash: passwordHash,
      role: dto.role,
      role_id: dto.role_id || null,
      creator_id: creator.id,
      allowed_modules: dto.allowed_modules,
      allowed_permissions: dto.allowed_permissions,
      is_active: true,
    });

    const savedUser = await this.userRepository.save(newUser);

    // 7. Return saved user without password hash
    const { password_hash, ...userWithoutPassword } = savedUser;
    return {
      message: 'User registered successfully',
      user: userWithoutPassword,
    };
  }
}
