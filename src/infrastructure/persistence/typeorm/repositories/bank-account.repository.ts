import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { BankAccount } from '../../../../domain/entities/bank-account.entity';
import { BaseTenantRepository } from './base-tenant.repository';

import { BankMovement } from '../../../../domain/entities/bank-movement.entity';
import { SalePayment } from '../../../../domain/entities/sale-payment.entity';
import { Sale } from '../../../../domain/entities/sale.entity';
import { Client } from '../../../../domain/entities/client.entity';
import { User } from '../../../../domain/entities/user.entity';
import { SalesFiscalNote } from '../../../../domain/entities/sales-fiscal-note.entity';

@Injectable({ scope: Scope.REQUEST })
export class BankAccountRepository extends BaseTenantRepository<BankAccount> {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
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

  async save(bankAccount: BankAccount): Promise<BankAccount> {
    bankAccount.tenant_id = this.tenantId;
    return this.bankAccountRepository.save(bankAccount);
  }

  async findById(id: string): Promise<BankAccount | null> {
    const conditions = this.enforceTenantCondition({ id, is_active: true });
    return this.bankAccountRepository.findOne({ where: conditions });
  }

  async findAll(): Promise<BankAccount[]> {
    const conditions = this.enforceTenantCondition({ is_active: true });
    return this.bankAccountRepository.find({ where: conditions, order: { created_at: 'DESC' } });
  }

  async softDelete(id: string): Promise<void> {
    const conditions = this.enforceTenantCondition({ id });
    await this.bankAccountRepository.update(conditions, { is_active: false });
  }

  async findMovementsWithDetails(accountId?: string, startDate?: string, endDate?: string): Promise<any[]> {
    const query = this.bankAccountRepository.manager
      .createQueryBuilder(BankMovement, 'm')
      .leftJoin(BankAccount, 'acc', 'acc.id = m.account_id')
      .leftJoin(SalePayment, 'sp', 'sp.id = m.sale_payment_id')
      .leftJoin(Sale, 's', 's.id = sp.sale_id')
      .leftJoin(Client, 'c', 'c.id = s.client_id')
      .leftJoin(User, 'u', 'u.id = m.created_by_user_id')
      .select([
        'm.id AS id',
        'm.type AS type',
        'm.amount AS amount',
        'm.reference AS reference',
        'm.description AS description',
        'm.created_at AS created_at',
        'acc.id AS account_id',
        'acc.name AS account_name',
        'acc.bank_name AS bank_name',
        'acc.currency AS currency',
        'acc.account_type AS account_type',
        'acc.color_theme AS account_color_theme',
        'sp.id AS payment_id',
        'sp.payment_method AS payment_method',
        'sp.last_four_digits AS last_four_digits',
        'sp.sender_identifier AS sender_identifier',
        'sp.transaction_reference AS transaction_reference',
        'sp.amount_usd AS payment_amount_usd',
        'sp.exchange_rate_applied AS payment_exchange_rate',
        's.id AS sale_id',
        's.invoice_number AS invoice_number',
        's.control_number AS control_number',
        's.exchange_rate_applied AS sale_exchange_rate',
        'c.name AS client_name',
        'c.tax_id AS client_tax_id',
        'u.full_name AS cashier_name',
      ])
      .where('m.tenant_id = :tenantId', { tenantId: this.tenantId });

    if (accountId && accountId !== 'ALL') {
      query.andWhere('m.account_id = :accountId', { accountId });
    }

    if (startDate) {
      query.andWhere('m.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('m.created_at <= :endDate', { endDate });
    }

    const rawMovements = await query.orderBy('m.created_at', 'DESC').getRawMany();

    const formattedMovements = rawMovements.map((r) => {
      const amountNum = parseFloat(r.amount);
      const isVes = r.currency === 'VES';
      const effectiveRate = parseFloat(r.payment_exchange_rate || r.sale_exchange_rate || '0');
      
      let amountUsd = 0;
      let amountVes = 0;

      if (isVes) {
        amountVes = amountNum;
        if (r.payment_amount_usd) {
          amountUsd = parseFloat(r.payment_amount_usd);
        } else if (effectiveRate > 0) {
          amountUsd = amountNum / effectiveRate;
        }
      } else {
        amountUsd = amountNum;
        if (effectiveRate > 0) {
          amountVes = amountNum * effectiveRate;
        }
      }

      return {
        id: r.id,
        type: r.type,
        amount: amountNum,
        amount_usd: amountUsd,
        amount_ves: amountVes,
        exchange_rate: effectiveRate > 0 ? effectiveRate : null,
        reference: r.reference || r.transaction_reference || null,
        description: r.description,
        created_at: r.created_at,
        account: {
          id: r.account_id,
          name: r.account_name,
          bank_name: r.bank_name,
          currency: r.currency,
          account_type: r.account_type,
          color_theme: r.account_color_theme || null,
        },
        payment_metadata: r.payment_id ? {
          payment_method: r.payment_method,
          last_four_digits: r.last_four_digits || null,
          sender_identifier: r.sender_identifier || null,
          transaction_reference: r.transaction_reference || null,
        } : null,
        sale: r.sale_id ? {
          id: r.sale_id,
          invoice_number: r.invoice_number || null,
          control_number: r.control_number || null,
          client_name: r.client_name || 'Cliente Genérico',
          client_tax_id: r.client_tax_id || null,
        } : null,
        created_by: {
          name: r.cashier_name || 'Sistema',
        },
      };
    });

    // If querying 'ALL' accounts or a specific account, include credit/debit notes linked to that account or globally
    let formattedNotes: any[] = [];
    const notesQuery = this.bankAccountRepository.manager
      .createQueryBuilder(SalesFiscalNote, 'n')
      .leftJoin(Sale, 's', 's.id = n.original_invoice_id')
      .leftJoin(Client, 'c', 'c.id = s.client_id')
      .leftJoin(SalePayment, 'sp', 'sp.sale_id = s.id')
      .leftJoin(BankAccount, 'acc', 'acc.id = sp.bank_account_id')
      .select([
        'n.id AS id',
        'n.type AS type',
        'n.document_number AS document_number',
        'n.control_number AS control_number',
        'n.total_usd AS total_usd',
        'n.total_ves AS total_ves',
        'n.exchange_rate AS exchange_rate',
        'n.reason_description AS reason_description',
        'n.created_at AS created_at',
        's.id AS sale_id',
        's.invoice_number AS invoice_number',
        's.payment_method AS sale_payment_method',
        's.exchange_rate_applied AS sale_exchange_rate',
        'c.name AS client_name',
        'c.tax_id AS client_tax_id',
        'acc.id AS account_id',
        'acc.name AS account_name',
        'acc.bank_name AS bank_name',
        'acc.currency AS account_currency',
        'acc.account_type AS account_type',
        'acc.color_theme AS account_color_theme',
      ])
      .where('n.tenant_id = :tenantId', { tenantId: this.tenantId });

    if (accountId && accountId !== 'ALL') {
      notesQuery.andWhere('sp.bank_account_id = :accountId', { accountId });
    }

    if (startDate) {
      notesQuery.andWhere('n.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      notesQuery.andWhere('n.created_at <= :endDate', { endDate });
    }

    const rawNotes = await notesQuery.orderBy('n.created_at', 'DESC').getRawMany();

    // Deduplicate notes by ID in case a sale had multiple split payments
    const seenNoteIds = new Set<string>();
    formattedNotes = rawNotes
      .filter((rn) => {
        if (seenNoteIds.has(rn.id)) return false;
        seenNoteIds.add(rn.id);
        return true;
      })
        .map((rn) => {
          const isCredit = rn.type === 'CREDIT';
          const currency = rn.account_currency || 'USD';
          const amountNum = currency === 'VES' ? parseFloat(rn.total_ves) : parseFloat(rn.total_usd);
          const totalUsdNum = parseFloat(rn.total_usd);
          const totalVesNum = parseFloat(rn.total_ves);
          const effectiveRate = parseFloat(rn.exchange_rate || rn.sale_exchange_rate || '0');

          return {
            id: rn.id,
            type: isCredit ? 'CREDIT_NOTE' : 'DEBIT_NOTE',
            amount: isCredit ? -amountNum : amountNum,
            amount_usd: isCredit ? -totalUsdNum : totalUsdNum,
            amount_ves: isCredit ? -totalVesNum : totalVesNum,
            exchange_rate: effectiveRate > 0 ? effectiveRate : null,
            reference: rn.document_number,
            description: `Ajuste Fiscal ${isCredit ? 'Nota de Crédito' : 'Nota de Débito'} #${rn.document_number} para Factura #${rn.invoice_number || 'S/N'}${rn.reason_description ? ': ' + rn.reason_description : ''}`,
            created_at: rn.created_at,
            account: {
              id: rn.account_id || 'GENERAL',
              name: rn.account_name || (rn.sale_payment_method?.includes('CASH') ? 'Caja de Efectivo' : 'Cuentas Generales'),
              bank_name: rn.bank_name || 'Fiscal / Tesorería',
              currency,
              account_type: rn.account_type || 'FISCAL',
              color_theme: rn.account_color_theme || (isCredit ? 'ROSE' : 'BLUE'),
            },
            payment_metadata: {
              payment_method: isCredit ? 'NOTA DE CRÉDITO' : 'NOTA DE DÉBITO',
              transaction_reference: rn.document_number,
            },
            sale: {
              id: rn.sale_id,
              invoice_number: rn.invoice_number || null,
              control_number: rn.control_number || null,
              client_name: rn.client_name || 'Cliente Genérico',
              client_tax_id: rn.client_tax_id || null,
            },
            fiscal_note: {
              id: rn.id,
              document_number: rn.document_number,
              type: rn.type,
              total_usd: parseFloat(rn.total_usd),
              total_ves: parseFloat(rn.total_ves),
            },
            created_by: {
              name: 'Auditoría Fiscal',
            },
          };
        });

    const combined = [...formattedMovements, ...formattedNotes];
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
