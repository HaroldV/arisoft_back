import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Client } from '../../../../domain/entities/client.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class ClientRepository extends BaseTenantRepository<Client> {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
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

  async findAll(filters: { name?: string; taxId?: string } = {}): Promise<Client[]> {
    const query = this.clientRepository.createQueryBuilder('client')
      .where('client.tenant_id = :tenantId', { tenantId: this.tenantId })
      .andWhere('client.is_active = :isActive', { isActive: true });

    if (filters.name) {
      query.andWhere('client.name ILIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.taxId) {
      query.andWhere('client.tax_id = :taxId', { taxId: filters.taxId });
    }

    return query.getMany();
  }

  async findById(id: string): Promise<Client | null> {
    const conditions = this.enforceTenantCondition({ id });
    return this.clientRepository.findOne({ where: conditions });
  }

  async findByTaxId(taxId: string): Promise<Client | null> {
    const conditions = this.enforceTenantCondition({ tax_id: taxId });
    return this.clientRepository.findOne({ where: conditions });
  }

  async save(client: Client): Promise<Client> {
    client.tenant_id = this.tenantId;
    return this.clientRepository.save(client);
  }

  async softDelete(id: string): Promise<void> {
    const conditions = this.enforceTenantCondition({ id });
    await this.clientRepository.update(conditions, { is_active: false });
  }
}
