import { Controller, Post, Get, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RegisterSubscriptionPaymentUseCase } from '../../../application/use-cases/subscription/register-subscription-payment.use-case';
import { SaasPlanManagementUseCase } from '../../../application/use-cases/admin/saas-plan-management.use-case';
import { SubscriptionPaymentReceipt, PaymentMethodEnum } from '../../../domain/entities/subscription-payment-receipt.entity';
import { SaasPlan } from '../../../domain/entities/saas-plan.entity';

@ApiTags('Subscription & Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly registerPaymentUseCase: RegisterSubscriptionPaymentUseCase,
    private readonly saasPlanManagementUseCase: SaasPlanManagementUseCase,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Obtener planes de suscripción disponibles' })
  async getPlans() {
    const plans = await this.saasPlanManagementUseCase.listPlans();
    return plans.filter((p) => p.is_active);
  }

  @Get('my-status')
  @ApiOperation({ summary: 'Obtener estado actual de suscripción y último pago registrado' })
  async getMySubscriptionStatus(@Req() req: any) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('Usuario no tiene una empresa asociada');
    }

    const receiptRepo = this.dataSource.getRepository(SubscriptionPaymentReceipt);
    const lastReceipt = await receiptRepo.findOne({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });

    return {
      has_pending_payment: lastReceipt?.status === 'PENDING_APPROVAL',
      last_receipt: lastReceipt || null,
      support_contact: {
        company: 'ArivSoft',
        whatsapp: '+584120000000',
        email: 'soporte@arivsoft.com',
        schedule: 'Lunes a Viernes 8:00 AM - 6:00 PM',
      },
    };
  }

  @Post('payments')
  @ApiOperation({ summary: 'Registrar informe de pago de suscripción para validación' })
  async registerPayment(@Req() req: any, @Body() body: any) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('Usuario no tiene una empresa asociada');
    }

    const {
      plan_code,
      billing_cycle,
      amount_usd,
      amount_bcv_bs,
      bcv_rate_used,
      payment_method,
      payment_reference,
      payment_date,
      bank_origin,
      zelle_account_owner,
      zelle_email,
      binance_id,
      binance_email,
      receipt_image_base64,
      notes,
    } = body;

    try {
      return await this.registerPaymentUseCase.execute({
        tenant_id: tenantId,
        plan_code,
        billing_cycle,
        amount_usd: Number(amount_usd),
        amount_bcv_bs: Number(amount_bcv_bs),
        bcv_rate_used: Number(bcv_rate_used),
        payment_method: payment_method as PaymentMethodEnum,
        payment_reference,
        payment_date,
        bank_origin,
        zelle_account_owner,
        zelle_email,
        binance_id,
        binance_email,
        receipt_image_base64,
        notes,
      });
    } catch (err: any) {
      console.error('❌ Error in SubscriptionController.registerPayment:', err);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException(err?.message || 'Error al procesar el registro de pago');
    }
  }
}
