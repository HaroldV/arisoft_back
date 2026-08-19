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
  payment_date?: string | Date;
  bank_origin?: string;
  zelle_account_owner?: string;
  zelle_email?: string;
  binance_id?: string;
  binance_email?: string;
  receipt_image_base64?: string;
  notes?: string;
}

@Injectable()
export class RegisterSubscriptionPaymentUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(dto: RegisterSubscriptionPaymentDto): Promise<SubscriptionPaymentReceipt> {
    if (!dto.tenant_id || !dto.plan_code) {
      throw new BadRequestException('El tenant y código de plan son obligatorios.');
    }

    if (dto.amount_usd <= 0) {
      throw new BadRequestException('El monto pagado en divisas debe ser mayor a cero.');
    }

    const repo = this.dataSource.getRepository(SubscriptionPaymentReceipt);

    // Control de Idempotencia y Anti-duplicados: Verificar si ya tiene un pago en revisión por ArivSoft
    const existingPending = await repo.findOne({
      where: {
        tenant_id: dto.tenant_id,
        status: SubscriptionPaymentStatusEnum.PENDING_APPROVAL,
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'Actualmente tienes un reporte de pago en proceso de verificación por el equipo de ArivSoft. No puedes registrar un nuevo pago hasta que el anterior sea procesado.'
      );
    }

    // Regla de Negocio: El comprobante / capture es 100% obligatorio para todos los métodos
    if (!dto.receipt_image_base64 || dto.receipt_image_base64.trim().length === 0) {
      throw new BadRequestException('El capture o comprobante del pago es estrictamente obligatorio para validar la transacción.');
    }

    const receipt = new SubscriptionPaymentReceipt();
    receipt.tenant_id = dto.tenant_id;
    receipt.plan_code = dto.plan_code;
    receipt.billing_cycle = dto.billing_cycle || 'MONTHLY';
    receipt.amount_usd = dto.amount_usd;
    receipt.amount_bcv_bs = dto.amount_bcv_bs || 0;
    receipt.bcv_rate_used = dto.bcv_rate_used || 1;
    receipt.payment_method = dto.payment_method;
    receipt.payment_date = dto.payment_date ? new Date(dto.payment_date) : new Date();
    receipt.receipt_image_base64 = dto.receipt_image_base64;
    receipt.notes = dto.notes || '';
    receipt.status = SubscriptionPaymentStatusEnum.PENDING_APPROVAL;

    // Validaciones específicas por Método de Pago
    if (dto.payment_method === PaymentMethodEnum.TRANSFER || dto.payment_method === PaymentMethodEnum.PAGO_MOVIL) {
      if (!dto.payment_reference || dto.payment_reference.trim().length === 0) {
        throw new BadRequestException('El número de referencia de la transferencia o pago móvil es requerido.');
      }
      if (!dto.bank_origin || dto.bank_origin.trim().length === 0) {
        throw new BadRequestException('El banco de origen es requerido.');
      }
      if (dto.amount_bcv_bs <= 0) {
        throw new BadRequestException('El monto en Bolívares debe ser mayor a cero.');
      }
      receipt.payment_reference = dto.payment_reference.trim().toUpperCase();
      receipt.bank_origin = dto.bank_origin.trim();
    } else if (dto.payment_method === PaymentMethodEnum.ZELLE) {
      if (!dto.zelle_account_owner || dto.zelle_account_owner.trim().length === 0) {
        throw new BadRequestException('El nombre del titular de la cuenta Zelle es requerido.');
      }
      if (!dto.zelle_email || dto.zelle_email.trim().length === 0) {
        throw new BadRequestException('El correo electrónico emisor de Zelle es requerido.');
      }
      receipt.zelle_account_owner = dto.zelle_account_owner.trim();
      receipt.zelle_email = dto.zelle_email.trim().toLowerCase();
      receipt.payment_reference = dto.payment_reference ? dto.payment_reference.trim().toUpperCase() : `ZELLE-${Date.now()}`;
      receipt.bank_origin = 'ZELLE';
    } else if (dto.payment_method === PaymentMethodEnum.BINANCE) {
      if (!dto.binance_id || dto.binance_id.trim().length === 0) {
        throw new BadRequestException('El Binance ID o Pay ID del emisor es requerido.');
      }
      if (!dto.binance_email || dto.binance_email.trim().length === 0) {
        throw new BadRequestException('El correo electrónico de la cuenta Binance es requerido.');
      }
      receipt.binance_id = dto.binance_id.trim();
      receipt.binance_email = dto.binance_email.trim().toLowerCase();
      receipt.payment_reference = dto.payment_reference ? dto.payment_reference.trim().toUpperCase() : `BINANCE-${Date.now()}`;
      receipt.bank_origin = 'BINANCE_PAY';
    } else {
      throw new BadRequestException(`Método de pago ${dto.payment_method} no soportado.`);
    }

    return await repo.save(receipt);
  }
}
