import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Sale } from '../../../../domain/entities/sale.entity';
import { User } from '../../../../domain/entities/user.entity';
import { SaleItem } from '../../../../domain/entities/sale-item.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { Client } from '../../../../domain/entities/client.entity';
import { StockMove, StockMoveType } from '../../../../domain/entities/stock-move.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class SaleRepository extends BaseTenantRepository<Sale> {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
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
      .leftJoin('sales_fiscal_notes', 'note', 'note.original_invoice_id = sale.id AND note.status = \'POSTED\'')
      .select([
        'sale.id AS id',
        'sale.total_amount_usd AS total_amount_usd',
        'sale.exchange_rate_applied AS exchange_rate_applied',
        'sale.status AS status',
        'sale.invoice_number AS invoice_number',
        'sale.control_number AS control_number',
        'sale.payment_method AS payment_method',
        'sale.created_at AS created_at',
        'user.id AS user_id',
        'user.full_name AS cashier_name',
        'user.email AS cashier_email',
        "STRING_AGG(CASE WHEN note.type = 'CREDIT' THEN note.document_number || ':' || note.id ELSE NULL END, ',') AS credit_notes",
        "STRING_AGG(CASE WHEN note.type = 'DEBIT' THEN note.document_number || ':' || note.id ELSE NULL END, ',') AS debit_notes",
        "SUM(CASE WHEN note.type = 'CREDIT' THEN note.total_usd ELSE 0 END) AS total_credited_usd",
      ])
      .where('sale.tenant_id = :tenantId', { tenantId: this.tenantId })
      .groupBy('sale.id')
      .addGroupBy('user.id')
      .orderBy('sale.created_at', 'DESC')
      .getRawMany();

    return rawResults.map(r => {
      const totalAmountUsd = parseFloat(r.total_amount_usd);
      const totalCreditedUsd = parseFloat(r.total_credited_usd || '0');
      let calculatedStatus = r.status;
      
      if (totalCreditedUsd >= totalAmountUsd - 0.01 && totalAmountUsd > 0) {
        calculatedStatus = 'ANULADA';
      } else if (totalCreditedUsd > 0.01 || r.debit_notes) {
        calculatedStatus = 'AJUSTADA';
      }

      return {
        id: r.id,
        total_amount_usd: totalAmountUsd,
        exchange_rate_applied: parseFloat(r.exchange_rate_applied),
        status: calculatedStatus,
        invoice_number: r.invoice_number || null,
        control_number: r.control_number || null,
        payment_method: r.payment_method || null,
        created_at: r.created_at,
        credit_notes: r.credit_notes || null,
        debit_notes: r.debit_notes || null,
        cashier: {
          id: r.user_id,
          full_name: r.cashier_name || 'N/A',
          email: r.cashier_email || 'N/A',
        },
      };
    });
  }

  async findSaleDetails(id: string): Promise<any | null> {
    const sale = await this.saleRepository.findOne({
      where: this.enforceTenantCondition({ id }),
    });

    if (!sale) return null;

    const cashier = await this.saleRepository.manager.findOne(User, {
      where: { id: sale.user_id },
    });

    let client = null;
    if (sale.client_id) {
      client = await this.saleRepository.manager.findOne(Client, {
        where: { id: sale.client_id },
      });
    }

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
      invoice_number: sale.invoice_number || null,
      control_number: sale.control_number || null,
      payment_method: sale.payment_method || null,
      created_at: sale.created_at,
      cashier: {
        id: sale.user_id,
        full_name: cashier?.full_name || 'N/A',
        email: cashier?.email || 'N/A',
      },
      client: client ? {
        id: client.id,
        name: client.name,
        tax_id: client.tax_id,
      } : null,
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
