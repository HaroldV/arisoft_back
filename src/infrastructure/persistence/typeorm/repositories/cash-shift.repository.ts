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
    return this.cashShiftRepository.findOne({
      where: conditions,
      relations: ['cashier', 'branch', 'branch.default_warehouse'],
    });
  }

  async findActiveShift(cashierId: string): Promise<CashShift | null> {
    const conditions = this.enforceTenantCondition({ cashier_id: cashierId, status: 'OPEN' });
    return this.cashShiftRepository.findOne({
      where: conditions,
      relations: ['cashier', 'branch', 'branch.default_warehouse'],
    });
  }

  async findLastClosedShift(): Promise<CashShift | null> {
    const conditions = this.enforceTenantCondition({ status: 'CLOSED' });
    return this.cashShiftRepository.findOne({
      where: conditions,
      relations: ['cashier', 'branch'],
      order: { closed_at: 'DESC' },
    });
  }

  async findAllShifts(): Promise<CashShift[]> {
    const conditions = this.enforceTenantCondition({});
    return this.cashShiftRepository.find({
      where: conditions,
      relations: ['cashier', 'branch', 'branch.default_warehouse'],
      order: { opened_at: 'DESC' },
    });
  }

  async findShiftDetailsWithBreakdown(shiftId: string): Promise<any> {
    const shift = await this.findById(shiftId);
    if (!shift) return null;

    // Fetch payments summary
    const paymentsSummary = await this.cashShiftRepository.manager
      .createQueryBuilder()
      .select('p.payment_method', 'method')
      .addSelect('SUM(p.amount_usd)', 'total_usd')
      .addSelect('SUM(p.amount_original)', 'total_original')
      .addSelect('p.currency', 'currency')
      .from('sale_payments', 'p')
      .innerJoin('sales', 's', 's.id = p.sale_id')
      .where('s.shift_id = :shiftId', { shiftId })
      .groupBy('p.payment_method, p.currency')
      .getRawMany();

    // Fetch products sold breakdown
    const productsBreakdown = await this.cashShiftRepository.manager
      .createQueryBuilder()
      .select('prod.id', 'product_id')
      .addSelect('prod.sku', 'sku')
      .addSelect('prod.name', 'name')
      .addSelect('SUM(item.quantity)', 'total_quantity')
      .addSelect('SUM(item.quantity * item.price_at_time_usd)', 'total_usd')
      .from('sale_items', 'item')
      .innerJoin('sales', 's', 's.id = item.sale_id')
      .innerJoin('products', 'prod', 'prod.id = item.product_id')
      .where('s.shift_id = :shiftId', { shiftId })
      .groupBy('prod.id, prod.sku, prod.name')
      .orderBy('total_quantity', 'DESC')
      .getRawMany();

    // Count sales and total billed
    const salesStats = await this.cashShiftRepository.manager
      .createQueryBuilder()
      .select('COUNT(s.id)', 'sales_count')
      .addSelect('COALESCE(SUM(s.total_amount_usd), 0)', 'total_billed_usd')
      .from('sales', 's')
      .where('s.shift_id = :shiftId', { shiftId })
      .getRawOne();

    return {
      shift,
      stats: {
        sales_count: parseInt(salesStats?.sales_count || '0', 10),
        total_billed_usd: parseFloat(salesStats?.total_billed_usd || '0'),
      },
      payments_summary: paymentsSummary.map((p) => ({
        method: p.method,
        total_usd: parseFloat(p.total_usd || '0'),
        total_original: parseFloat(p.total_original || '0'),
        currency: p.currency,
      })),
      products_sold: productsBreakdown.map((p) => ({
        product_id: p.product_id,
        sku: p.sku,
        name: p.name,
        quantity: parseInt(p.total_quantity || '0', 10),
        total_usd: parseFloat(p.total_usd || '0'),
      })),
    };
  }
}
