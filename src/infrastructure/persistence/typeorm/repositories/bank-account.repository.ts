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

  async findMovementsWithDetails(accountId?: string): Promise<any[]> {
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
        'sp.id AS payment_id',
        'sp.payment_method AS payment_method',
        'sp.last_four_digits AS last_four_digits',
        'sp.sender_identifier AS sender_identifier',
        'sp.transaction_reference AS transaction_reference',
        's.id AS sale_id',
        's.invoice_number AS invoice_number',
        's.control_number AS control_number',
        'c.name AS client_name',
        'c.tax_id AS client_tax_id',
        'u.full_name AS cashier_name',
      ])
      .where('m.tenant_id = :tenantId', { tenantId: this.tenantId });

    if (accountId) {
      query.andWhere('m.account_id = :accountId', { accountId });
    }

    const raw = await query.orderBy('m.created_at', 'DESC').getRawMany();

    return raw.map((r) => ({
      id: r.id,
      type: r.type,
      amount: parseFloat(r.amount),
      reference: r.reference || r.transaction_reference || null,
      description: r.description,
      created_at: r.created_at,
      account: {
        id: r.account_id,
        name: r.account_name,
        bank_name: r.bank_name,
        currency: r.currency,
        account_type: r.account_type,
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
    }));
  }
}
