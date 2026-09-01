import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { PurchaseInvoice } from '../../../../domain/entities/purchase-invoice.entity';
import { User } from '../../../../domain/entities/user.entity';
import { PurchaseItem } from '../../../../domain/entities/purchase-item.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { AccountPayable } from '../../../../domain/entities/account-payable.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class PurchaseInvoiceRepository extends BaseTenantRepository<PurchaseInvoice> {
  constructor(
    @InjectRepository(PurchaseInvoice)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoice>,
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
      .leftJoin('purchase_fiscal_notes', 'note', 'note.original_invoice_id = invoice.id AND note.status = \'POSTED\'')
      .leftJoin('accounts_payable', 'ap', 'ap.reference_document_id = invoice.id OR ap.reference_document_number = invoice.invoice_number OR ap.supplier_invoice_number = invoice.invoice_number')
      .select([
        'invoice.id AS id',
        'invoice.invoice_number AS invoice_number',
        'invoice.supplier_name AS supplier_name',
        'invoice.total_amount_usd AS total_amount_usd',
        'invoice.discount_percentage AS discount_percentage',
        'invoice.discount_amount_usd AS discount_amount_usd',
        'invoice.proof_file_path AS proof_file_path',
        'invoice.created_by_user_id AS created_by_user_id',
        'invoice.created_at AS created_at',
        'user.full_name AS creator_name',
        'user.email AS creator_email',
        'ap.id AS payable_id',
        'ap.status AS payable_status',
        'ap.total_paid AS payable_total_paid',
        'ap.balance_due AS payable_balance_due',
        "STRING_AGG(CASE WHEN note.type = 'CREDIT' THEN note.document_number || ':' || note.id ELSE NULL END, ',') AS credit_notes",
        "STRING_AGG(CASE WHEN note.type = 'DEBIT' THEN note.document_number || ':' || note.id ELSE NULL END, ',') AS debit_notes",
        "SUM(CASE WHEN note.type = 'CREDIT' THEN note.total_usd ELSE 0 END) AS total_credited_usd",
      ])
      .where('invoice.tenant_id = :tenantId', { tenantId: this.tenantId })
      .andWhere('invoice.deleted_at IS NULL')
      .groupBy('invoice.id')
      .addGroupBy('user.id')
      .addGroupBy('ap.id')
      .addGroupBy('ap.status')
      .addGroupBy('ap.total_paid')
      .addGroupBy('ap.balance_due')
      .orderBy('invoice.created_at', 'DESC')
      .getRawMany();

    // Fetch standalone accounts payable that are not associated with a purchase_invoice record
    const standalonePayables = await this.purchaseInvoiceRepository.manager
      .createQueryBuilder(AccountPayable, 'ap')
      .leftJoin(User, 'user', 'user.id = ap.created_by_user_id')
      .where('ap.tenant_id = :tenantId', { tenantId: this.tenantId })
      .andWhere('ap.reference_document_id IS NULL')
      .orderBy('ap.created_at', 'DESC')
      .select([
        'ap.id AS id',
        'ap.supplier_invoice_number AS supplier_invoice_number',
        'ap.reference_document_number AS reference_document_number',
        'ap.provider_name AS provider_name',
        'ap.period_amount AS period_amount',
        'ap.previous_balance AS previous_balance',
        'ap.total_paid AS total_paid',
        'ap.balance_due AS balance_due',
        'ap.status AS status',
        'ap.voucher_attachment_url AS voucher_attachment_url',
        'ap.created_at AS created_at',
        'ap.reference_date AS reference_date',
        'user.id AS creator_id',
        'user.full_name AS creator_name',
        'user.email AS creator_email',
      ])
      .getRawMany();

    const formattedInvoices = rawResults.map(r => {
      const totalAmountUsd = parseFloat(r.total_amount_usd);
      const totalCreditedUsd = parseFloat(r.total_credited_usd || '0');
      let calculatedStatus = 'PAGADA'; // default status

      if (totalCreditedUsd >= totalAmountUsd - 0.01 && totalAmountUsd > 0) {
        calculatedStatus = 'ANULADA';
      } else if (totalCreditedUsd > 0.01 || r.debit_notes) {
        calculatedStatus = 'AJUSTADA';
      }

      // Resolve Financial Payment Status from Accounts Payable
      let paymentStatus = r.payable_status || 'PAID';
      const totalPaidUsd = r.payable_total_paid !== undefined && r.payable_total_paid !== null ? parseFloat(r.payable_total_paid) : totalAmountUsd;
      const balanceDueUsd = r.payable_balance_due !== undefined && r.payable_balance_due !== null ? parseFloat(r.payable_balance_due) : 0.00;

      return {
        id: r.id,
        invoice_number: r.invoice_number,
        supplier_name: r.supplier_name,
        total_amount_usd: totalAmountUsd,
        discount_percentage: r.discount_percentage ? parseFloat(r.discount_percentage) : 0,
        discount_amount_usd: r.discount_amount_usd ? parseFloat(r.discount_amount_usd) : 0,
        proof_file_path: r.proof_file_path,
        created_at: r.created_at,
        status: calculatedStatus,
        payable_id: r.payable_id || null,
        payment_status: paymentStatus,
        total_paid_usd: totalPaidUsd,
        balance_due_usd: balanceDueUsd,
        credit_notes: r.credit_notes || null,
        debit_notes: r.debit_notes || null,
        created_by: {
          id: r.created_by_user_id,
          full_name: r.creator_name || 'N/A',
          email: r.creator_email || 'N/A',
        },
      };
    });

    const formattedStandalone = standalonePayables.map(ap => {
      const totalAmountUsd = parseFloat(ap.period_amount || ap.previous_balance || ap.total_paid || '0');
      const totalPaidUsd = parseFloat(ap.total_paid || '0');
      const balanceDueUsd = parseFloat(ap.balance_due || '0');
      const invoiceNumber = ap.supplier_invoice_number || ap.reference_document_number || `CXP-${ap.id.substring(0, 8).toUpperCase()}`;

      return {
        id: ap.id,
        invoice_number: invoiceNumber,
        supplier_name: ap.provider_name || 'Proveedor General',
        total_amount_usd: totalAmountUsd,
        discount_percentage: 0,
        discount_amount_usd: 0,
        proof_file_path: ap.voucher_attachment_url || null,
        created_at: ap.created_at || ap.reference_date,
        status: 'PAGADA',
        payable_id: ap.id,
        payment_status: ap.status || 'PAID',
        total_paid_usd: totalPaidUsd,
        balance_due_usd: balanceDueUsd,
        credit_notes: null,
        debit_notes: null,
        created_by: {
          id: ap.creator_id,
          full_name: ap.creator_name || 'N/A',
          email: ap.creator_email || 'N/A',
        },
      };
    });

    // Combine and sort by date descending
    return [...formattedInvoices, ...formattedStandalone].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  async findPurchaseDetails(id: string): Promise<any | null> {
    const invoice = await this.purchaseInvoiceRepository.findOne({
      where: this.enforceTenantCondition({ id }),
    });

    if (!invoice) {
      // Check if this ID belongs to a standalone AccountPayable
      const standalone = await this.purchaseInvoiceRepository.manager.findOne(AccountPayable, {
        where: { id, tenant_id: this.tenantId },
        relations: ['payments'],
      });

      if (!standalone) return null;

      const creator = standalone.created_by_user_id
        ? await this.purchaseInvoiceRepository.manager.findOne(User, {
            where: { id: standalone.created_by_user_id },
          })
        : null;

      const totalAmountUsd = parseFloat(standalone.period_amount as any || standalone.previous_balance as any || standalone.total_paid as any || '0');
      const invoiceNumber = standalone.supplier_invoice_number || standalone.reference_document_number || `CXP-${standalone.id.substring(0, 8).toUpperCase()}`;

      return {
        id: standalone.id,
        invoice_number: invoiceNumber,
        supplier_name: standalone.provider_name || 'Proveedor General',
        total_amount_usd: totalAmountUsd,
        discount_percentage: 0,
        discount_amount_usd: 0,
        proof_file_path: standalone.voucher_attachment_url || null,
        created_at: standalone.created_at || standalone.reference_date,
        payable_id: standalone.id,
        payment_status: standalone.status || 'PAID',
        total_paid_usd: parseFloat(standalone.total_paid as any || '0'),
        balance_due_usd: parseFloat(standalone.balance_due as any || '0'),
        created_by: {
          id: standalone.created_by_user_id || 'N/A',
          full_name: creator?.full_name || standalone.created_by_user_name || 'N/A',
          email: creator?.email || 'N/A',
        },
        items: [],
      };
    }

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

    const payable = await this.purchaseInvoiceRepository.manager
      .createQueryBuilder(AccountPayable, 'ap')
      .where('(ap.reference_document_id = :id OR ap.reference_document_number = :invoiceNumber)', {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
      })
      .andWhere('ap.tenant_id = :tenantId', { tenantId: this.tenantId })
      .getOne();

    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      supplier_name: invoice.supplier_name,
      total_amount_usd: parseFloat(invoice.total_amount_usd as any),
      discount_percentage: invoice.discount_percentage ? parseFloat(invoice.discount_percentage as any) : 0,
      discount_amount_usd: invoice.discount_amount_usd ? parseFloat(invoice.discount_amount_usd as any) : 0,
      proof_file_path: invoice.proof_file_path,
      created_at: invoice.created_at,
      payable_id: payable?.id || null,
      payment_status: payable?.status || 'PAID',
      total_paid_usd: payable ? parseFloat(payable.total_paid as any) : parseFloat(invoice.total_amount_usd as any),
      balance_due_usd: payable ? parseFloat(payable.balance_due as any) : 0.00,
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
