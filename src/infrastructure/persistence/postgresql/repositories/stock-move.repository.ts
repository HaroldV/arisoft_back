import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { StockMove, StockMoveType } from '../../../../domain/entities/stock-move.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class StockMoveRepository extends BaseTenantRepository<StockMove> {
  constructor(
    @InjectRepository(StockMove)
    private readonly stockMoveRepository: Repository<StockMove>,
    @Inject(REQUEST) request: any,
  ) {
    const tenantId = request?.tenant_id || request?.headers?.['x-tenant-id'] || (process.env.NODE_ENV === 'test' ? 'test-tenant' : undefined);
    super(tenantId);
  }

  async save(move: StockMove): Promise<StockMove> {
    move.tenant_id = this.tenantId;
    return this.stockMoveRepository.save(move);
  }

  async findByProduct(tenantId: string, productId: string): Promise<StockMove[]> {
    const conditions = this.enforceTenantCondition({ product_id: productId });
    return this.stockMoveRepository.find({
      where: conditions,
      order: { created_at: 'DESC' },
    });
  }

  async getCurrentStock(productId: string): Promise<number> {
    const conditions = this.enforceTenantCondition({ product_id: productId });
    const result = await this.stockMoveRepository
      .createQueryBuilder('move')
      .select('SUM(move.quantity)', 'sum')
      .where('move.tenant_id = :tenantId', { tenantId: this.tenantId })
      .andWhere('move.product_id = :productId', { productId })
      .getRawOne();
    return parseInt(result?.sum || '0', 10);
  }

  async getCurrentStocks(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const results = await this.stockMoveRepository
      .createQueryBuilder('move')
      .select('move.product_id', 'productId')
      .addSelect('SUM(move.quantity)', 'sum')
      .where('move.tenant_id = :tenantId', { tenantId: this.tenantId })
      .andWhere('move.product_id IN (:...productIds)', { productIds })
      .groupBy('move.product_id')
      .getRawMany();

    const stockMap = new Map<string, number>();
    for (const r of results) {
      stockMap.set(r.productId, parseInt(r.sum || '0', 10));
    }
    return stockMap;
  }

  async hasSales(productId: string): Promise<boolean> {
    const conditions = this.enforceTenantCondition({
      product_id: productId,
      type: StockMoveType.SALE,
    });
    const count = await this.stockMoveRepository.count({
      where: conditions,
    });
    return count > 0;
  }
}
