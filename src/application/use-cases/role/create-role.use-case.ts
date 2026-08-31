import { Injectable, BadRequestException } from '@nestjs/common';
import { RoleRepository } from '../../../infrastructure/persistence/typeorm/repositories/role.repository';
import { Role } from '../../../domain/entities/role.entity';
import { UserRole } from '../../../domain/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class CreateRoleUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute(
    tenantId: string,
    creator: { role: string; permissions: string[] },
    dto: CreateRoleDto,
  ) {
    const existing = await this.roleRepo.findByName(tenantId, dto.name.trim());
    if (existing) {
      throw new BadRequestException(`El rol "${dto.name}" ya existe para este inquilino`);
    }

    // Validate that the creator is not assigning permissions they themselves do not possess
    if (creator.role !== UserRole.OWNER) {
      const creatorPermissionsSet = new Set(creator.permissions || []);
      const missing = dto.allowed_permissions.filter(p => !creatorPermissionsSet.has(p));
      if (missing.length > 0) {
        throw new BadRequestException(
          `No tienes permiso para delegar los siguientes alcances: ${missing.join(', ')}`,
        );
      }
    }

    const role = new Role({
      tenant_id: tenantId,
      name: dto.name.trim(),
      allowed_permissions: dto.allowed_permissions,
      is_system: false,
    });

    return this.roleRepo.save(role);
  }
}
