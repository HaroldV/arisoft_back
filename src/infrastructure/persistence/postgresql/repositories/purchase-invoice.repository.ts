import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { PurchaseInvoice } from '../../../../domain/entities/purchase-invoice.entity';
import { User } from '../../../../domain/entities/user.entity';
import { PurchaseItem } from '../../../../domain/entities/purchase-item.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class PurchaseInvoiceRepository extends BaseTenantRepository<PurchaseInvoice> {
  constructor(
    @InjectRepository(PurchaseInvoice)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoice>,
    @Inject(REQUEST) request: any,
  ) {
    const tenantId = request?.tenant_id || request?.headers?.['x-tenant-id'] || (process.env.NODE_ENV === 'test' ? 'test-tenant' : undefined);
    super(tenantId);
  }

  async findByInvoiceNumber(invoiceNumber: string, supplierName: string): Promise<PurchaseInvoice | null> {
    const conditions = this.enforceTenantCondition({
      invoice_number: invoiceNumber,
      supplier_name: supplierName,
    });
    return this.purchaseInvoiceRepository.findOne({ where: conditions });
  }

  async save(invoice: PurchaseInvoice): Promise<PurchaseInvoice> {
    invoice.tenant_id = this.tenantId;
    return this.purchaseInvoiceRepository.save(invoice);
  }

  async findPurchasesWithCreator(): Promise<any[]> {
    const rawResults = await this.purchaseInvoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin(User, 'user', 'user.id = invoice.created_by_user_id')
      .select([
        'invoice.id AS id',
        'invoice.invoice_number AS invoice_number',
        'invoice.supplier_name AS supplier_name',
        'invoice.total_amount_usd AS total_amount_usd',
        'invoice.proof_file_path AS proof_file_path',
        'invoice.created_by_user_id AS created_by_user_id',
        'invoice.created_at AS created_at',
        'user.full_name AS creator_name',
        'user.email AS creator_email',
      ])
      .where('invoice.tenant_id = :tenantId', { tenantId: this.tenantId })
      .andWhere('invoice.deleted_at IS NULL')
      .orderBy('invoice.created_at', 'DESC')
      .getRawMany();

    return rawResults.map(r => ({
      id: r.id,
      invoice_number: r.invoice_number,
      supplier_name: r.supplier_name,
      total_amount_usd: parseFloat(r.total_amount_usd),
      proof_file_path: r.proof_file_path,
      created_at: r.created_at,
      created_by: {
        id: r.created_by_user_id,
        full_name: r.creator_name || 'N/A',
        email: r.creator_email || 'N/A',
      },
    }));
  }

  async findPurchaseDetails(id: string): Promise<any | null> {
    const invoice = await this.purchaseInvoiceRepository.findOne({
      where: this.enforceTenantCondition({ id }),
    });

    if (!invoice) return null;

    const creator = await this.purchaseInvoiceRepository.manager.findOne(User, {
      where: { id: invoice.created_by_user_id },
    });

    const items = await this.purchaseInvoiceRepository.manager
      .createQueryBuilder(PurchaseItem, 'item')
      .leftJoin(Product, 'product', 'product.id = item.product_id')
      .select([
        'item.id AS id',
        'item.product_id AS product_id',
        'item.quantity AS quantity',
        'item.unit_cost_usd AS unit_cost_usd',
        'product.sku AS product_sku',
        'product.name AS product_name',
      ])
      .where('item.purchase_id = :purchaseId', { purchaseId: invoice.id })
      .andWhere('item.deleted_at IS NULL')
      .getRawMany();

    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      supplier_name: invoice.supplier_name,
      total_amount_usd: parseFloat(invoice.total_amount_usd as any),
      proof_file_path: invoice.proof_file_path,
      created_at: invoice.created_at,
      created_by: {
        id: invoice.created_by_user_id,
        full_name: creator?.full_name || 'N/A',
        email: creator?.email || 'N/A',
      },
      items: items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost_usd: parseFloat(item.unit_cost_usd),
        product_sku: item.product_sku || 'N/A',
        product_name: item.product_name || 'N/A',
      })),
    };
  }
}
