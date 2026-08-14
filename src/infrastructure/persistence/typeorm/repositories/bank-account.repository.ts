import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { BankAccount } from '../../../../domain/entities/bank-account.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class BankAccountRepository extends BaseTenantRepository<BankAccount> {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
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

  async save(bankAccount: BankAccount): Promise<BankAccount> {
    bankAccount.tenant_id = this.tenantId;
    return this.bankAccountRepository.save(bankAccount);
  }

  async findById(id: string): Promise<BankAccount | null> {
    const conditions = this.enforceTenantCondition({ id, is_active: true });
    return this.bankAccountRepository.findOne({ where: conditions });
  }

  async findAll(): Promise<BankAccount[]> {
    const conditions = this.enforceTenantCondition({ is_active: true });
    return this.bankAccountRepository.find({ where: conditions, order: { created_at: 'DESC' } });
  }

  async softDelete(id: string): Promise<void> {
    const conditions = this.enforceTenantCondition({ id });
    await this.bankAccountRepository.update(conditions, { is_active: false });
  }
}
