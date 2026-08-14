import { Injectable } from '@nestjs/common';
import { AccountReceivablePayableRepository } from '../../../infrastructure/persistence/typeorm/repositories/account-receivable-payable.repository';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountReceivablePayable, AccountStatus } from '../../../domain/entities/account-receivable-payable.entity';
import { PaymentMethod } from '../../../domain/entities/account-payment.entity';

@Injectable()
export class CreateAccountUseCase {
  constructor(
    private readonly accountRepository: AccountReceivablePayableRepository,
  ) {}

  async execute(
    tenantId: string, 
    dto: CreateAccountDto, 
    user?: { id: string; name?: string }
  ): Promise<AccountReceivablePayable> {
    const previousBalance = dto.previous_balance || 0;
    const periodAmount = dto.period_amount || 0;
    
    // Calculate initial payments
    const cashBs = dto.cash_bs || 0;
    const debitBs = dto.debit_bs || 0;
    const cashUsd = dto.cash_usd || 0;
    
    const totalPaid = cashBs + debitBs + cashUsd;
    const totalDebt = previousBalance + periodAmount;
    const balanceDue = Math.max(0, totalDebt - totalPaid);

    let status = AccountStatus.PENDING;
    if (balanceDue <= 0 && totalDebt > 0) {
      status = AccountStatus.PAID;
    } else if (totalPaid > 0) {
      status = AccountStatus.PARTIAL;
    }

    const payments: any[] = [];
    if (cashBs > 0) {
      payments.push({
        payment_method: PaymentMethod.CASH_BS,
        currency: 'BS',
        amount: cashBs,
        amount_usd: cashBs,
        created_by_user_id: user?.id,
        created_by_user_name: user?.name,
      });
    }
    if (debitBs > 0) {
      payments.push({
        payment_method: PaymentMethod.DEBIT_BS,
        currency: 'BS',
        amount: debitBs,
        amount_usd: debitBs,
        created_by_user_id: user?.id,
        created_by_user_name: user?.name,
      });
    }
    if (cashUsd > 0) {
      payments.push({
        payment_method: PaymentMethod.CASH_USD,
        currency: 'USD',
        amount: cashUsd,
        amount_usd: cashUsd,
        created_by_user_id: user?.id,
        created_by_user_name: user?.name,
      });
    }

    const account = new AccountReceivablePayable();
    account.tenant_id = tenantId;
    account.type = dto.type;
    account.entity_type = dto.entity_type;
    account.entity_id = dto.entity_id;
    account.entity_name = dto.entity_name;
    account.reference_date = dto.reference_date || new Date().toISOString().split('T')[0];
    account.notes = dto.notes;
    account.previous_balance = previousBalance;
    account.period_amount = periodAmount;
    account.total_paid = totalPaid;
    account.balance_due = balanceDue;
    account.status = status;
    account.created_by_user_id = user?.id;
    account.created_by_user_name = user?.name;
    account.payments = payments;

    return this.accountRepository.save(account);
  }
}
