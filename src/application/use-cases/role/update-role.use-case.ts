import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../../../infrastructure/persistence/typeorm/repositories/role.repository';
import { UserRole } from '../../../domain/entities/user.entity';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../domain/constants/domain.constants';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UpdateRoleUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute(
    tenantId: string,
    roleId: string,
    editor: { role: string; permissions: string[] },
    dto: UpdateRoleDto,
  ) {
    const role = await this.roleRepo.findById(roleId);
    if (!role || role.tenant_id !== tenantId) {
      throw new NotFoundException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.ROLE_NOT_FOUND);
    }

    if (role.is_system) {
      throw new BadRequestException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.ROLE_IS_SYSTEM);
    }

    const trimmedName = dto.name.trim();
    if (trimmedName.toLowerCase() !== role.name.toLowerCase()) {
      const existing = await this.roleRepo.findByName(tenantId, trimmedName);
      if (existing && existing.id !== roleId) {
        throw new BadRequestException(`El rol "${trimmedName}" ya existe para este comercio.`);
      }
    }

    if (editor.role !== UserRole.OWNER) {
      const editorPermissionsSet = new Set(editor.permissions || []);
      const missing = dto.allowed_permissions.filter(p => !editorPermissionsSet.has(p));
      if (missing.length > 0) {
        throw new BadRequestException(
          `No tienes permiso para delegar los siguientes alcances: ${missing.join(', ')}`,
        );
      }
    }

    role.name = trimmedName;
    role.allowed_permissions = dto.allowed_permissions;

    return this.roleRepo.save(role);
  }
}
