import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../../../domain/entities/tenant.entity';

@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { id, is_active: true } });
  }

  async findByTaxId(taxId: string): Promise<Tenant | null> {
    const cleanTaxId = taxId ? taxId.toUpperCase().trim() : '';
    return this.tenantRepository
      .createQueryBuilder('tenant')
      .where('UPPER(TRIM(tenant.tax_id)) = :taxId', { taxId: cleanTaxId })
      .getOne();
  }

  async save(tenant: Tenant): Promise<Tenant> {
    return this.tenantRepository.save(tenant);
  }
}
