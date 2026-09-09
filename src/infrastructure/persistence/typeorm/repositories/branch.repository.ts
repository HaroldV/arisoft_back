import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../../../domain/entities/branch.entity';

@Injectable()
export class BranchRepository {
  constructor(
    @InjectRepository(Branch)
    private readonly repository: Repository<Branch>,
  ) {}

  private assertTenantId(tenantId: string): void {
    if (!tenantId || !tenantId.trim()) {
      throw new BadRequestException('El tenant_id es estrictamente requerido para operar sobre sucursales.');
    }
  }

  async findByTenantId(tenantId: string): Promise<Branch[]> {
    this.assertTenantId(tenantId);
    return this.repository.find({
      where: { tenant_id: tenantId },
      relations: ['default_warehouse'],
      order: { is_main: 'DESC', created_at: 'ASC' },
    });
  }

  async findById(tenantId: string, id: string): Promise<Branch | null> {
    this.assertTenantId(tenantId);
    return this.repository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['default_warehouse'],
    });
  }

  async findByCode(tenantId: string, code: string): Promise<Branch | null> {
    this.assertTenantId(tenantId);
    return this.repository.findOne({
      where: { tenant_id: tenantId, code: code.trim().toUpperCase() },
    });
  }

  async countByTenantId(tenantId: string): Promise<number> {
    this.assertTenantId(tenantId);
    return this.repository.count({
      where: { tenant_id: tenantId },
    });
  }

  async save(branch: Partial<Branch>): Promise<Branch> {
    if (!branch.tenant_id) {
      throw new BadRequestException('No se puede persistir una sucursal sin asociar a un tenant.');
    }
    return this.repository.save(branch);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.assertTenantId(tenantId);
    await this.repository.delete({ id, tenant_id: tenantId });
  }
}
