import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubscriptionPaymentReceipt, SubscriptionPaymentStatusEnum } from '../../../domain/entities/subscription-payment-receipt.entity';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { User } from '../../../domain/entities/user.entity';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../domain/constants/domain.constants';

@Injectable()
export class ApproveSubscriptionPaymentUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(receiptId: string, adminUserId: string) {
    const receiptRepo = this.dataSource.getRepository(SubscriptionPaymentReceipt);
    const tenantRepo = this.dataSource.getRepository(Tenant);
    const userRepo = this.dataSource.getRepository(User);

    const receipt = await receiptRepo.findOne({ where: { id: receiptId } });
    if (!receipt) {
      throw new NotFoundException('Comprobante de pago no encontrado.');
    }

    if (receipt.status === SubscriptionPaymentStatusEnum.APPROVED) {
      throw new BadRequestException('Este pago ya ha sido aprobado previamente.');
    }

    const tenant = await tenantRepo.findOne({ where: { id: receipt.tenant_id } });
    if (!tenant) {
      throw new NotFoundException('Empresa/Tenant no encontrada para este comprobante.');
    }

    // 1. Aprobar Comprobante
    receipt.status = SubscriptionPaymentStatusEnum.APPROVED;
    receipt.reviewed_at = new Date();
    receipt.reviewed_by_user_id = adminUserId;
    const savedReceipt = await receiptRepo.save(receipt);

    // 2. Activar Tenant y marcar plan_is_active = true, renovando suscripción por 30/365 días
    tenant.is_active = true;
    tenant.plan_is_active = true;
    tenant.plan_type = receipt.plan_code || tenant.plan_type;

    const daysToAdd = receipt.billing_cycle === 'ANNUAL' 
      ? BACKEND_SYSTEM_CONSTANTS.ANNUAL_DAYS_STANDARD 
      : BACKEND_SYSTEM_CONSTANTS.SUBSCRIPTION_RENEWAL_DAYS;

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + daysToAdd);
    tenant.trial_expires_at = newExpiry;

    const savedTenant = await tenantRepo.save(tenant);

    // 3. Reactivar usuarios propietarios de la empresa
    const ownerUsers = await userRepo.find({
      where: { tenant_id: tenant.id },
    });

    if (ownerUsers && ownerUsers.length > 0) {
      for (const user of ownerUsers) {
        user.is_active = true;
        user.failed_login_attempts = 0;
        await userRepo.save(user);
      }
    }

    return {
      message: `Pago aprobado. La empresa ${tenant.company_name} ha sido activada con éxito.`,
      receipt: savedReceipt,
      tenant: savedTenant,
    };
  }
}
