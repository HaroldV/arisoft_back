import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../../domain/entities/role.entity';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { id } });
  }

  async findByName(tenantId: string, name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { tenant_id: tenantId, name } });
  }

  async findAllByTenant(tenantId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { tenant_id: tenantId },
      order: { is_system: 'DESC', name: 'ASC' },
    });
  }

  async save(role: Role): Promise<Role> {
    return this.roleRepository.save(role);
  }

  async delete(id: string): Promise<void> {
    await this.roleRepository.delete(id);
  }
}
