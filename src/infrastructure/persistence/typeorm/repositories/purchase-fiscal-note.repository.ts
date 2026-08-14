import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { PurchaseFiscalNote } from '../../../../domain/entities/purchase-fiscal-note.entity';
import { PurchaseFiscalNoteItem } from '../../../../domain/entities/purchase-fiscal-note-item.entity';
import { Provider } from '../../../../domain/entities/provider.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class PurchaseFiscalNoteRepository extends BaseTenantRepository<PurchaseFiscalNote> {
  constructor(
    @InjectRepository(PurchaseFiscalNote)
    private readonly purchaseFiscalNoteRepository: Repository<PurchaseFiscalNote>,
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

  async save(note: PurchaseFiscalNote): Promise<PurchaseFiscalNote> {
    note.tenant_id = this.tenantId;

    if (note.id) {
      const existing = await this.purchaseFiscalNoteRepository.findOne({ where: { id: note.id } });
      if (existing && existing.status === 'POSTED') {
        throw new Error('No se puede modificar una Nota Fiscal de Compra en estado POSTED. Regla de inmutabilidad fiscal.');
      }
    }

    return this.purchaseFiscalNoteRepository.save(note);
  }

  async saveItem(item: PurchaseFiscalNoteItem): Promise<PurchaseFiscalNoteItem> {
    return this.purchaseFiscalNoteRepository.manager.save(PurchaseFiscalNoteItem, item);
  }

  async findById(id: string): Promise<PurchaseFiscalNote | null> {
    const conditions = this.enforceTenantCondition({ id });
    return this.purchaseFiscalNoteRepository.findOne({ where: conditions });
  }

  async findNotesList(): Promise<PurchaseFiscalNote[]> {
    return this.purchaseFiscalNoteRepository.find({
      where: this.enforceTenantCondition({}),
      order: { created_at: 'DESC' },
    });
  }

  async findNoteDetails(id: string): Promise<any | null> {
    const note = await this.purchaseFiscalNoteRepository.findOne({
      where: this.enforceTenantCondition({ id }),
    });

    if (!note) return null;

    // Get the provider information from the original purchase invoice
    const rawInvoiceQuery = await this.purchaseFiscalNoteRepository.manager.query(
      'SELECT provider_id FROM purchase_invoices WHERE id = $1',
      [note.original_invoice_id]
    );

    let provider = null;
    if (rawInvoiceQuery && rawInvoiceQuery.length > 0) {
      const invoiceRow = rawInvoiceQuery[0];
      if (invoiceRow.provider_id) {
        provider = await this.purchaseFiscalNoteRepository.manager.findOne(Provider, {
          where: { id: invoiceRow.provider_id },
        });
      }
    }

    const items = await this.purchaseFiscalNoteRepository.manager
      .createQueryBuilder(PurchaseFiscalNoteItem, 'item')
      .leftJoin(Product, 'product', 'product.id = item.product_id')
      .select([
        'item.id AS id',
        'item.product_id AS product_id',
        'item.description AS description',
        'item.quantity AS quantity',
        'item.unit_price_usd AS unit_price_usd',
        'item.tax_rate AS tax_rate',
        'item.tax_amount_usd AS tax_amount_usd',
        'item.total_usd AS total_usd',
        'item.subtotal_ves AS subtotal_ves',
        'item.tax_amount_ves AS tax_amount_ves',
        'item.total_ves AS total_ves',
        'product.sku AS product_sku',
        'product.name AS product_name',
      ])
      .where('item.note_id = :noteId', { noteId: note.id })
      .getRawMany();

    return {
      id: note.id,
      document_number: note.document_number,
      control_number: note.control_number,
      type: note.type,
      date: note.date,
      reason_code: note.reason_code,
      reason_description: note.reason_description,
      currency: note.currency,
      exchange_rate: parseFloat(note.exchange_rate as any),
      subtotal_usd: parseFloat(note.subtotal_usd as any),
      tax_amount_usd: parseFloat(note.tax_amount_usd as any),
      total_usd: parseFloat(note.total_usd as any),
      subtotal_ves: parseFloat(note.subtotal_ves as any),
      tax_amount_ves: parseFloat(note.tax_amount_ves as any),
      total_ves: parseFloat(note.total_ves as any),
      status: note.status,
      original_invoice_id: note.original_invoice_id,
      provider: provider ? {
        id: provider.id,
        name: provider.name,
        rif: provider.rif,
      } : null,
      items: items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price_usd: parseFloat(item.unit_price_usd),
        tax_rate: parseFloat(item.tax_rate),
        tax_amount_usd: parseFloat(item.tax_amount_usd),
        total_usd: parseFloat(item.total_usd),
        subtotal_ves: parseFloat(item.subtotal_ves),
        tax_amount_ves: parseFloat(item.tax_amount_ves),
        total_ves: parseFloat(item.total_ves),
        product_sku: item.product_sku || 'N/A',
        product_name: item.product_name || 'N/A',
      })),
    };
  }
}
