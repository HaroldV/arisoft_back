import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Sale } from '../../../../domain/entities/sale.entity';
import { User } from '../../../../domain/entities/user.entity';
import { SaleItem } from '../../../../domain/entities/sale-item.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { StockMove, StockMoveType } from '../../../../domain/entities/stock-move.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class SaleRepository extends BaseTenantRepository<Sale> {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @Inject(REQUEST) request: any,
  ) {
    const tenantId = request?.tenant_id || request?.headers?.['x-tenant-id'] || (process.env.NODE_ENV === 'test' ? 'test-tenant' : undefined);
    super(tenantId);
  }

  async save(sale: Sale): Promise<Sale> {
    sale.tenant_id = this.tenantId;
    return this.saleRepository.save(sale);
  }

  async findById(id: string): Promise<Sale | null> {
    const conditions = this.enforceTenantCondition({ id });
    return this.saleRepository.findOne({ where: conditions });
  }

  async findSalesWithCashier(): Promise<any[]> {
    const rawResults = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoin(User, 'user', 'user.id = sale.user_id')
      .select([
        'sale.id AS id',
        'sale.total_amount_usd AS total_amount_usd',
        'sale.exchange_rate_applied AS exchange_rate_applied',
        'sale.status AS status',
        'sale.created_at AS created_at',
        'user.id AS user_id',
        'user.full_name AS cashier_name',
        'user.email AS cashier_email',
      ])
      .where('sale.tenant_id = :tenantId', { tenantId: this.tenantId })
      .orderBy('sale.created_at', 'DESC')
      .getRawMany();

    return rawResults.map(r => ({
      id: r.id,
      total_amount_usd: parseFloat(r.total_amount_usd),
      exchange_rate_applied: parseFloat(r.exchange_rate_applied),
      status: r.status,
      created_at: r.created_at,
      cashier: {
        id: r.user_id,
        full_name: r.cashier_name || 'N/A',
        email: r.cashier_email || 'N/A',
      },
    }));
  }

  async findSaleDetails(id: string): Promise<any | null> {
    const sale = await this.saleRepository.findOne({
      where: this.enforceTenantCondition({ id }),
    });

    if (!sale) return null;

    const cashier = await this.saleRepository.manager.findOne(User, {
      where: { id: sale.user_id },
    });

    const items = await this.saleRepository.manager
      .createQueryBuilder(SaleItem, 'item')
      .leftJoin(Product, 'product', 'product.id = item.product_id')
      .leftJoin(
        StockMove,
        'move',
        'move.source_id = item.sale_id AND move.product_id = item.product_id AND move.type = :moveType',
        { moveType: StockMoveType.SALE }
      )
      .select([
        'item.id AS id',
        'item.product_id AS product_id',
        'item.quantity AS quantity',
        'item.price_at_time_usd AS price_at_time_usd',
        'product.sku AS product_sku',
        'product.name AS product_name',
        'move.justification AS justification',
      ])
      .where('item.sale_id = :saleId', { saleId: sale.id })
      .getRawMany();

    return {
      id: sale.id,
      total_amount_usd: parseFloat(sale.total_amount_usd as any),
      exchange_rate_applied: parseFloat(sale.exchange_rate_applied as any),
      status: sale.status,
      created_at: sale.created_at,
      cashier: {
        id: sale.user_id,
        full_name: cashier?.full_name || 'N/A',
        email: cashier?.email || 'N/A',
      },
      items: items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_time_usd: parseFloat(item.price_at_time_usd),
        product_sku: item.product_sku || 'N/A',
        product_name: item.product_name || 'N/A',
        justification: item.justification || null,
      })),
    };
  }
}
