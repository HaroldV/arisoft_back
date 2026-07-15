import { Injectable, Inject, Scope, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { TenantFiscalRange, FiscalDocType } from '../../../../domain/entities/tenant-fiscal-range.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class TenantFiscalRangeRepository extends BaseTenantRepository<TenantFiscalRange> {
  constructor(
    @InjectRepository(TenantFiscalRange)
    private readonly tenantFiscalRangeRepository: Repository<TenantFiscalRange>,
    @Inject(REQUEST) request: any,
  ) {
    const tenantId = request?.tenant_id || request?.headers?.['x-tenant-id'] || (process.env.NODE_ENV === 'test' ? 'test-tenant' : undefined);
    super(tenantId);
  }

  async save(range: TenantFiscalRange): Promise<TenantFiscalRange> {
    range.tenant_id = this.tenantId;
    return this.tenantFiscalRangeRepository.save(range);
  }

  async findRanges(): Promise<TenantFiscalRange[]> {
    return this.tenantFiscalRangeRepository.find({
      where: this.enforceTenantCondition({}),
    });
  }

  async getNextRangeNumbers(
    type: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE',
    manager?: EntityManager
  ): Promise<{ documentNumber: string; controlNumber: string }> {
    const activeManager = manager || this.tenantFiscalRangeRepository.manager;
    // Pessimistic write lock to ensure concurrency safety
    let range = await activeManager
      .createQueryBuilder(TenantFiscalRange, 'range')
      .setLock('pessimistic_write')
      .where('range.tenant_id = :tenantId AND range.type = :type', { tenantId: this.tenantId, type })
      .getOne();

    if (!range) {
      const typeLabel = type === FiscalDocType.INVOICE 
        ? 'Facturas' 
        : type === FiscalDocType.CREDIT_NOTE 
          ? 'Notas de Crédito' 
          : 'Notas de Débito';
      throw new BadRequestException(
        `No se encuentra configurado un rango fiscal para ${typeLabel} (tipo ${type}) en este Tenant. Por favor configúrelo en Ajustes -> Control Fiscal.`
      );
    }

    if (range.current_number >= range.end_number) {
      throw new Error(`El rango fiscal para ${type} ha expirado. (Límite: ${range.end_number})`);
    }

    const nextNumber = range.current_number + 1;
    range.current_number = nextNumber;
    await activeManager.save(range);

    const padded = String(nextNumber).padStart(8, '0');
    let prefix = 'FACT';
    if (type === FiscalDocType.CREDIT_NOTE) {
      prefix = 'NOT-CR';
    } else if (type === FiscalDocType.DEBIT_NOTE) {
      prefix = 'NOT-DB';
    }
    return {
      documentNumber: `${prefix}-${padded}`,
      controlNumber: `00-${padded}`,
    };
  }
}
