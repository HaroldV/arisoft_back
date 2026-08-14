import { Injectable, Inject, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { TenantRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from '../../../domain/entities/user.entity';

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

    // 4. Validate modules delegation limits
    const permissionToModuleMap: Record<string, string> = {
      'pos:create': 'POS',
      'pos:discount': 'POS',
      'pos:refund': 'POS',
      'clients:manage': 'POS',
      'inventory:view': 'INVENTORY',
      'inventory:write': 'INVENTORY',
      'inventory:adjust': 'INVENTORY',
      'purchases:register': 'INVENTORY',
      'providers:manage': 'INVENTORY',
      'banks:view': 'BANKS',
      'banks:write': 'BANKS',
      'banks:transfer': 'BANKS',
      'users:manage': 'SETTINGS',
      'fiscal:manage': 'SETTINGS',
      'company:manage': 'SETTINGS',
    };

    if ((!dto.allowed_modules || dto.allowed_modules.length === 0) && dto.allowed_permissions) {
      const resolvedMods = new Set<string>();
      dto.allowed_permissions.forEach(perm => {
        const mod = permissionToModuleMap[perm];
        if (mod) resolvedMods.add(mod);
      });
      dto.allowed_modules = Array.from(resolvedMods) as any[];
    }

    const tenant = await this.tenantRepository.findById(creator.tenant_id);
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const tenantModules = tenant.settings?.enabled_modules || ['POS', 'INVENTORY', 'SETTINGS', 'BANKS', 'PAYROLL'];
    
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
      ? [
          'pos:create', 'pos:discount', 'pos:refund', 'clients:manage',
          'inventory:view', 'inventory:write', 'inventory:adjust', 'purchases:register', 'providers:manage',
          'banks:view', 'banks:write', 'banks:transfer',
          'users:manage', 'fiscal:manage', 'company:manage'
        ]
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
