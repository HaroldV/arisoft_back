import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoleRepository } from '../../../infrastructure/persistence/typeorm/repositories/role.repository';
import { User } from '../../../domain/entities/user.entity';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../domain/constants/domain.constants';

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(tenantId: string, roleId: string) {
    const role = await this.roleRepo.findById(roleId);
    if (!role || role.tenant_id !== tenantId) {
      throw new NotFoundException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.ROLE_NOT_FOUND);
    }

    if (role.is_system) {
      throw new BadRequestException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.ROLE_IS_SYSTEM);
    }

    // Safety guard: Verify if any active or existing users are currently assigned to this role
    const usersCount = await this.dataSource.getRepository(User).count({
      where: [
        { tenant_id: tenantId, role_id: roleId },
        { tenant_id: tenantId, role: role.name },
      ],
    });

    if (usersCount > 0) {
      throw new BadRequestException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.ROLE_IN_USE(usersCount));
    }

    await this.roleRepo.delete(roleId);
    return { success: true, message: `El rol "${role.name}" ha sido eliminado exitosamente.` };
  }
}
