import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountReceivablePayable, AccountType } from '../../../../domain/entities/account-receivable-payable.entity';

@Injectable()
export class AccountReceivablePayableRepository {
  constructor(
    @InjectRepository(AccountReceivablePayable)
    private readonly repository: Repository<AccountReceivablePayable>,
  ) {}

  async save(account: Partial<AccountReceivablePayable>): Promise<AccountReceivablePayable> {
    return this.repository.save(account);
  }

  async saveMany(accounts: Partial<AccountReceivablePayable>[]): Promise<AccountReceivablePayable[]> {
    return this.repository.save(accounts);
  }

  async findById(id: string): Promise<AccountReceivablePayable | null> {
    return this.repository.findOne({ 
      where: { id },
      relations: ['payments'],
    });
  }

  async findAccountWithPayments(id: string, tenantId: string): Promise<AccountReceivablePayable | null> {
    return this.repository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['payments'],
    });
  }

  async findAccountsByTenant(
    tenantId: string,
    type: AccountType,
    search?: string,
  ): Promise<AccountReceivablePayable[]> {
    const qb = this.repository.createQueryBuilder('acc')
      .leftJoinAndSelect('acc.payments', 'payments')
      .where('acc.tenant_id = :tenantId', { tenantId })
      .andWhere('acc.type = :type', { type })
      .orderBy('acc.created_at', 'DESC')
      .addOrderBy('payments.created_at', 'DESC');

    if (search) {
      qb.andWhere('(LOWER(acc.entity_name) LIKE :search OR LOWER(acc.notes) LIKE :search)', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    return qb.getMany();
  }

  async calculateSummaryKPIs(tenantId: string, type: AccountType): Promise<{
    total_previous_balance: number;
    total_period_amount: number;
    total_paid: number;
    total_balance_due: number;
  }> {
    const result = await this.repository.createQueryBuilder('acc')
      .select('SUM(acc.previous_balance)', 'total_previous_balance')
      .addSelect('SUM(acc.period_amount)', 'total_period_amount')
      .addSelect('SUM(acc.total_paid)', 'total_paid')
      .addSelect('SUM(acc.balance_due)', 'total_balance_due')
      .where('acc.tenant_id = :tenantId', { tenantId })
      .andWhere('acc.type = :type', { type })
      .getRawOne();

    return {
      total_previous_balance: parseFloat(result?.total_previous_balance || '0'),
      total_period_amount: parseFloat(result?.total_period_amount || '0'),
      total_paid: parseFloat(result?.total_paid || '0'),
      total_balance_due: parseFloat(result?.total_balance_due || '0'),
    };
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
