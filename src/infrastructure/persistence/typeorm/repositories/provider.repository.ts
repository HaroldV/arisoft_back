import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Provider } from '../../../../domain/entities/provider.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class ProviderRepository extends BaseTenantRepository<Provider> {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @Inject(REQUEST) request: any,
  ) {
    const tenantId = 
      request?.user?.tenant_id || 
      request?.tenant_id || 
      request?.headers?.['x-tenant-id'] || 
      request?.headers?.['X-Tenant-Id'] || 
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    super(tenantId);
  }

  async findAll(filters: { name?: string; taxId?: string } = {}): Promise<Provider[]> {
    const conditions = this.enforceTenantCondition({ is_active: true });
    
    const query = this.providerRepository.createQueryBuilder('provider')
      .where('provider.tenant_id = :tenantId', { tenantId: this.tenantId })
      .andWhere('provider.is_active = :isActive', { isActive: true });

    if (filters.name) {
      query.andWhere('provider.name ILIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.taxId) {
      query.andWhere('provider.tax_id = :taxId', { taxId: filters.taxId });
    }

    return query.getMany();
  }

  async findById(id: string): Promise<Provider | null> {
    const conditions = this.enforceTenantCondition({ id });
    return this.providerRepository.findOne({ where: conditions });
  }

  async findByTaxId(taxId: string): Promise<Provider | null> {
    const conditions = this.enforceTenantCondition({ tax_id: taxId });
    return this.providerRepository.findOne({ where: conditions });
  }

  async save(provider: Provider): Promise<Provider> {
    provider.tenant_id = this.tenantId;
    return this.providerRepository.save(provider);
  }

  async softDelete(id: string): Promise<void> {
    const conditions = this.enforceTenantCondition({ id });
    await this.providerRepository.update(conditions, { is_active: false });
  }
}
