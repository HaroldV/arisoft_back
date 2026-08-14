import { Injectable } from '@nestjs/common';
import { RoleRepository } from '../../../infrastructure/persistence/typeorm/repositories/role.repository';

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute(tenantId: string) {
    return this.roleRepo.findAllByTenant(tenantId);
  }
}
