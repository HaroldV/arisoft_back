import { Controller, Post, Get, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RegisterSubscriptionPaymentUseCase } from '../../../application/use-cases/subscription/register-subscription-payment.use-case';
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
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Obtener planes de suscripción disponibles' })
  async getPlans() {
    return await this.dataSource.getRepository(SaasPlan).find({ where: { is_active: true } });
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
      bank_origin,
      notes,
    } = body;

    return await this.registerPaymentUseCase.execute({
      tenant_id: tenantId,
      plan_code,
      billing_cycle,
      amount_usd: Number(amount_usd),
      amount_bcv_bs: Number(amount_bcv_bs),
      bcv_rate_used: Number(bcv_rate_used),
      payment_method: payment_method as PaymentMethodEnum,
      payment_reference,
      bank_origin,
      notes,
    });
  }
}
