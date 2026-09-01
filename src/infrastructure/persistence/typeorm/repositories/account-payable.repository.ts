import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountPayable } from '../../../../domain/entities/account-payable.entity';
import { AccountStatusEnum, FINANCIAL_CONSTANTS } from '../../../../domain/constants/domain.constants';

@Injectable()
export class AccountPayableRepository {
  constructor(
    @InjectRepository(AccountPayable)
    private readonly repository: Repository<AccountPayable>,
  ) {}

  async save(account: Partial<AccountPayable>): Promise<AccountPayable> {
    return this.repository.save(account);
  }

  async saveMany(accounts: Partial<AccountPayable>[]): Promise<AccountPayable[]> {
    return this.repository.save(accounts);
  }

  async findById(id: string): Promise<AccountPayable | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['payments'],
    });
  }

  async findAccountWithPayments(id: string, tenantId: string): Promise<AccountPayable | null> {
    return this.repository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['payments'],
    });
  }

  async findAccountsByTenant(tenantId: string, search?: string): Promise<AccountPayable[]> {
    const qb = this.repository.createQueryBuilder('acc')
      .leftJoinAndSelect('acc.payments', 'payments')
      .where('acc.tenant_id = :tenantId', { tenantId })
      .orderBy('acc.created_at', 'DESC');

    if (search) {
      qb.andWhere('(LOWER(acc.provider_name) LIKE :search OR LOWER(acc.notes) LIKE :search)', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    return qb.getMany();
  }

  async calculateSummaryKPIs(tenantId: string): Promise<{
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
      .getRawOne();

    return {
      total_previous_balance: parseFloat(result?.total_previous_balance || FINANCIAL_CONSTANTS.ZERO_STRING_FALLBACK),
      total_period_amount: parseFloat(result?.total_period_amount || FINANCIAL_CONSTANTS.ZERO_STRING_FALLBACK),
      total_paid: parseFloat(result?.total_paid || FINANCIAL_CONSTANTS.ZERO_STRING_FALLBACK),
      total_balance_due: parseFloat(result?.total_balance_due || FINANCIAL_CONSTANTS.ZERO_STRING_FALLBACK),
    };
  }

  async getPendingSummary(tenantId: string): Promise<{ count: number; total_balance_due: number }> {
    const result = await this.repository.createQueryBuilder('acc')
      .select('COUNT(acc.id)', 'count')
      .addSelect('SUM(acc.balance_due)', 'total_balance_due')
      .where('acc.tenant_id = :tenantId', { tenantId })
      .andWhere('acc.status != :paidStatus', { paidStatus: AccountStatusEnum.PAID })
      .andWhere('acc.balance_due > :minBalance', { minBalance: FINANCIAL_CONSTANTS.MIN_BALANCE_THRESHOLD })
      .getRawOne();

    return {
      count: parseInt(result?.count || FINANCIAL_CONSTANTS.ZERO_STRING_FALLBACK, 10),
      total_balance_due: parseFloat(result?.total_balance_due || FINANCIAL_CONSTANTS.ZERO_STRING_FALLBACK),
    };
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
