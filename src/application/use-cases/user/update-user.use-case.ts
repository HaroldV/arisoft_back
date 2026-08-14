import { Injectable, Inject, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { TenantRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from '../../../domain/entities/user.entity';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(
    updater: { id: string; role: string; tenant_id: string; enabled_modules: string[]; permissions: string[] },
    targetUserId: string,
    dto: UpdateUserDto,
  ): Promise<any> {
    // 1. Fetch target user
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // 2. Validate tenant isolation
    if (targetUser.tenant_id !== updater.tenant_id) {
      throw new ForbiddenException('Access denied to other tenant data');
    }

    // 3. Validate updater authorization
    if (updater.role !== UserRole.OWNER) {
      if (updater.role === UserRole.MANAGER) {
        // Manager can edit themselves, or users in their recursive sub-tree
        if (updater.id !== targetUserId) {
          const subordinates = await this.userRepository.findSubordinatesRecursive(updater.tenant_id, updater.id);
          const isSubordinate = subordinates.some(sub => sub.id === targetUserId);
          if (!isSubordinate) {
            throw new ForbiddenException('You do not have permission to manage this user');
          }
        } else {
          // Self-update constraints
          if (dto.role || dto.allowed_modules || dto.allowed_permissions || dto.is_active !== undefined) {
            throw new ForbiddenException('You cannot modify your own role, active status, or permissions');
          }
        }
      } else {
        throw new ForbiddenException('Only owners and managers can update user accounts');
      }
    }

    // 4. Validate role updates
    if (dto.role) {
      if (updater.role === UserRole.MANAGER && dto.role === UserRole.OWNER) {
        throw new ForbiddenException('Managers cannot assign the Owner role');
      }
    }

    // 5. Validate module permission updates
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

    if (dto.allowed_permissions && (!dto.allowed_modules || dto.allowed_modules.length === 0)) {
      const resolvedMods = new Set<string>();
      dto.allowed_permissions.forEach(perm => {
        const mod = permissionToModuleMap[perm];
        if (mod) resolvedMods.add(mod);
      });
      dto.allowed_modules = Array.from(resolvedMods) as any[];
    }

    if (dto.allowed_modules) {
      const tenant = await this.tenantRepository.findById(updater.tenant_id);
      if (!tenant) {
        throw new BadRequestException('Tenant not found');
      }
      const tenantModules = tenant.settings?.enabled_modules || ['POS', 'INVENTORY', 'SETTINGS', 'BANKS', 'PAYROLL'];
      
      const creatorAllowedModules = updater.role === UserRole.OWNER 
        ? tenantModules 
        : updater.enabled_modules || [];

      const invalidModules = dto.allowed_modules.filter(mod => !creatorAllowedModules.includes(mod));
      if (invalidModules.length > 0) {
        throw new BadRequestException(
          `Cannot delegate access to modules: ${invalidModules.join(', ')}. You do not have access to these modules.`
        );
      }
    }

    // Validate granular permission updates
    if (dto.allowed_permissions) {
      const creatorAllowedPermissions = updater.role === UserRole.OWNER
        ? [
            'pos:create', 'pos:discount', 'pos:refund', 'clients:manage',
            'inventory:view', 'inventory:write', 'inventory:adjust', 'purchases:register', 'providers:manage',
            'banks:view', 'banks:write', 'banks:transfer',
            'users:manage', 'fiscal:manage', 'company:manage'
          ]
        : updater.permissions || [];

      const invalidPermissions = dto.allowed_permissions.filter(perm => !creatorAllowedPermissions.includes(perm));
      if (invalidPermissions.length > 0) {
        throw new BadRequestException(
          `Cannot delegate access to permissions: ${invalidPermissions.join(', ')}. You do not have access to these permissions.`
        );
      }
    }

    // 6. Handle active status transition / reassignments
    if (dto.is_active === false && targetUser.is_active === true) {
      if (dto.transfer_subordinates_to_id) {
        const newSupervisor = await this.userRepository.findById(dto.transfer_subordinates_to_id);
        if (!newSupervisor) {
          throw new NotFoundException('New supervisor not found');
        }
        if (newSupervisor.tenant_id !== updater.tenant_id || !newSupervisor.is_active) {
          throw new BadRequestException('Selected supervisor is invalid or inactive');
        }

        // Reassign direct subordinates (where creator_id is targetUser.id)
        const subordinates = await this.userRepository.findSubordinatesRecursive(targetUser.tenant_id, targetUser.id);
        const directSubordinates = subordinates.filter(sub => sub.creator_id === targetUser.id);
        for (const sub of directSubordinates) {
          sub.creator_id = newSupervisor.id;
          await this.userRepository.save(sub);
        }
      } else {
        // Cascade deactivation to all recursive subordinates
        const subordinates = await this.userRepository.findSubordinatesRecursive(targetUser.tenant_id, targetUser.id);
        for (const sub of subordinates) {
          if (sub.is_active) {
            sub.is_active = false;
            await this.userRepository.save(sub);
          }
        }
      }
    }

    // 7. Update target fields
    if (dto.full_name !== undefined) targetUser.full_name = dto.full_name;
    if (dto.email !== undefined) targetUser.email = dto.email.toLowerCase().trim();
    if (dto.role !== undefined) targetUser.role = dto.role;
    if (dto.role_id !== undefined) targetUser.role_id = dto.role_id || null;
    if (dto.allowed_modules !== undefined) targetUser.allowed_modules = dto.allowed_modules;
    if (dto.allowed_permissions !== undefined) targetUser.allowed_permissions = dto.allowed_permissions;
    if (dto.is_active !== undefined) targetUser.is_active = dto.is_active;

    if (dto.password !== undefined) {
      targetUser.password_hash = await this.authService.hashPassword(dto.password);
    }

    // 8. Save updated user
    const savedUser = await this.userRepository.save(targetUser);

    // 9. Return user profile without password hash
    const { password_hash, ...userWithoutPassword } = savedUser;
    return {
      message: 'User updated successfully',
      user: userWithoutPassword,
    };
  }
}
