import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubscriptionPaymentReceipt, PaymentMethodEnum, SubscriptionPaymentStatusEnum } from '../../../domain/entities/subscription-payment-receipt.entity';

export interface RegisterSubscriptionPaymentDto {
  tenant_id: string;
  plan_code: string;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  amount_usd: number;
  amount_bcv_bs: number;
  bcv_rate_used: number;
  payment_method: PaymentMethodEnum;
  payment_reference: string;
  bank_origin?: string;
  notes?: string;
}

@Injectable()
export class RegisterSubscriptionPaymentUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(dto: RegisterSubscriptionPaymentDto): Promise<SubscriptionPaymentReceipt> {
    if (!dto.tenant_id || !dto.plan_code || !dto.payment_reference) {
      throw new BadRequestException('El tenant, código de plan y la referencia de pago son obligatorios.');
    }

    if (dto.amount_usd <= 0 || dto.amount_bcv_bs <= 0) {
      throw new BadRequestException('El monto pagado debe ser mayor a cero.');
    }

    const receipt = new SubscriptionPaymentReceipt();
    receipt.tenant_id = dto.tenant_id;
    receipt.plan_code = dto.plan_code;
    receipt.billing_cycle = dto.billing_cycle || 'MONTHLY';
    receipt.amount_usd = dto.amount_usd;
    receipt.amount_bcv_bs = dto.amount_bcv_bs;
    receipt.bcv_rate_used = dto.bcv_rate_used;
    receipt.payment_method = dto.payment_method;
    receipt.payment_reference = dto.payment_reference.trim().toUpperCase();
    receipt.bank_origin = dto.bank_origin || 'BANCO_NACIONAL';
    receipt.notes = dto.notes || '';
    receipt.status = SubscriptionPaymentStatusEnum.PENDING_APPROVAL;

    const repo = this.dataSource.getRepository(SubscriptionPaymentReceipt);
    return await repo.save(receipt);
  }
}
