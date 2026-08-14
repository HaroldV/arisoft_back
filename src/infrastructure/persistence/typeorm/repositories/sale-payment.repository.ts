import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { SalePayment } from '../../../../domain/entities/sale-payment.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class SalePaymentRepository extends BaseTenantRepository<SalePayment> {
  constructor(
    @InjectRepository(SalePayment)
    private readonly salePaymentRepository: Repository<SalePayment>,
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

  async save(payment: SalePayment): Promise<SalePayment> {
    payment.tenant_id = this.tenantId;
    return this.salePaymentRepository.save(payment);
  }

  async findBySaleId(saleId: string): Promise<SalePayment[]> {
    const conditions = this.enforceTenantCondition({ sale_id: saleId });
    return this.salePaymentRepository.find({ where: conditions });
  }
}
