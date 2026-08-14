import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountReceivablePayableRepository } from '../../../infrastructure/persistence/typeorm/repositories/account-receivable-payable.repository';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { AccountReceivablePayable, AccountStatus } from '../../../domain/entities/account-receivable-payable.entity';
import { AccountPayment } from '../../../domain/entities/account-payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RegisterPaymentUseCase {
  constructor(
    private readonly accountRepository: AccountReceivablePayableRepository,
    @InjectRepository(AccountPayment)
    private readonly paymentRepository: Repository<AccountPayment>,
  ) {}

  async execute(
    tenantId: string, 
    accountId: string, 
    dto: RegisterPaymentDto,
    user?: { id: string; name?: string }
  ): Promise<AccountReceivablePayable> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || account.tenant_id !== tenantId) {
      throw new NotFoundException('Account record not found');
    }

    const exchangeRate = dto.exchange_rate || 1;
    const isBs = dto.payment_method.includes('BS');
    const currency = isBs ? 'BS' : 'USD';
    
    // Exact decimal precision: 4 decimal places for internal USD conversion
    const rawUsd = currency === 'BS' ? (dto.amount / exchangeRate) : dto.amount;
    const amountUsd = Number(rawUsd.toFixed(4));

    const payment = new AccountPayment();
    payment.account_id = accountId;
    payment.payment_method = dto.payment_method;
    payment.currency = currency;
    payment.amount = dto.amount;
    payment.exchange_rate = exchangeRate;
    payment.amount_usd = amountUsd;
    payment.reference_number = dto.reference_number;
    payment.created_by_user_id = user?.id;
    payment.created_by_user_name = user?.name;

    await this.paymentRepository.save(payment);

    // Update account balances with exact 2-decimal precision
    const newTotalPaid = Number((Number(account.total_paid) + amountUsd).toFixed(2));
    const totalDebt = Number((Number(account.previous_balance) + Number(account.period_amount)).toFixed(2));
    const newBalanceDue = Number(Math.max(0, totalDebt - newTotalPaid).toFixed(2));

    let status = AccountStatus.PARTIAL;
    if (newBalanceDue <= 0) {
      status = AccountStatus.PAID;
    }

    account.total_paid = newTotalPaid;
    account.balance_due = newBalanceDue;
    account.status = status;

    return this.accountRepository.save(account);
  }
}
