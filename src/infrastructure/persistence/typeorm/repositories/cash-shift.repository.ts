import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { CashShift } from '../../../../domain/entities/cash-shift.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class CashShiftRepository extends BaseTenantRepository<CashShift> {
  constructor(
    @InjectRepository(CashShift)
    private readonly cashShiftRepository: Repository<CashShift>,
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

  async save(shift: CashShift): Promise<CashShift> {
    shift.tenant_id = this.tenantId;
    return this.cashShiftRepository.save(shift);
  }

  async findById(id: string): Promise<CashShift | null> {
    const conditions = this.enforceTenantCondition({ id });
    return this.cashShiftRepository.findOne({ where: conditions });
  }

  async findActiveShift(cashierId: string): Promise<CashShift | null> {
    const conditions = this.enforceTenantCondition({ cashier_id: cashierId, status: 'OPEN' });
    return this.cashShiftRepository.findOne({ where: conditions });
  }

  async findLastClosedShift(): Promise<CashShift | null> {
    const conditions = this.enforceTenantCondition({ status: 'CLOSED' });
    return this.cashShiftRepository.findOne({
      where: conditions,
      order: { closed_at: 'DESC' },
    });
  }

  async findAllShifts(): Promise<CashShift[]> {
    const conditions = this.enforceTenantCondition({});
    return this.cashShiftRepository.find({
      where: conditions,
      order: { opened_at: 'DESC' },
    });
  }
}
