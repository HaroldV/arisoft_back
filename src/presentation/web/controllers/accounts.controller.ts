import { Controller, Get, Post, Body, Param, Query, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';
import { AccountReceivableRepository } from '../../../infrastructure/persistence/typeorm/repositories/account-receivable.repository';
import { AccountPayableRepository } from '../../../infrastructure/persistence/typeorm/repositories/account-payable.repository';
import { CreateAccountDto } from '../../../application/use-cases/account/dto/create-account.dto';
import { RegisterPaymentDto } from '../../../application/use-cases/account/dto/register-payment.dto';
import { AccountReceivable, AccountStatus } from '../../../domain/entities/account-receivable.entity';
import { AccountPayable } from '../../../domain/entities/account-payable.entity';

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('accounts')
@UseGuards(JwtAuthGuard, ModulesGuard, PermissionsGuard)
export class AccountsController {
  constructor(
    private readonly receivableRepo: AccountReceivableRepository,
    private readonly payableRepo: AccountPayableRepository,
  ) {}

  // Dedicated Cuentas por Cobrar (CxC) Endpoints
  @Get('receivables')
  @RequiredModules(AppModule.BANKS)
  @RequiredPermissions('banks:view')
  @ApiOperation({ summary: 'Get Cuentas por Cobrar (CxC) list and KPIs' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async getReceivables(
    @Headers('x-tenant-id') tenantId: string,
    @Query('search') search: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    const items = await this.receivableRepo.findAccountsByTenant(tenantId, search);
    const kpis = await this.receivableRepo.calculateSummaryKPIs(tenantId);
    return { kpis, items };
  }

  @Post('receivables')
  @RequiredModules(AppModule.BANKS)
  @RequiredPermissions('banks:write')
  @ApiOperation({ summary: 'Create Cuentas por Cobrar (CxC) record' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async createReceivable(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateAccountDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    const prev = Number(dto.previous_balance || 0);
    const period = Number(dto.period_amount || 0);
    const debt = prev + period;

    const acc = new AccountReceivable();
    acc.tenant_id = tenantId;
    acc.client_name = dto.entity_name;
    acc.reference_date = dto.reference_date || new Date().toISOString().split('T')[0];
    acc.notes = dto.notes;
    acc.previous_balance = prev;
    acc.period_amount = period;
    acc.total_paid = 0;
    acc.balance_due = debt;
    acc.created_by_user_id = req.user.sub;
    acc.created_by_user_name = req.user.full_name || req.user.email;

    return this.receivableRepo.save(acc);
  }

  // Dedicated Cuentas por Pagar (CxP) Endpoints
  @Get('payables')
  @RequiredModules(AppModule.BANKS)
  @RequiredPermissions('banks:view')
  @ApiOperation({ summary: 'Get Cuentas por Pagar (CxP) list and KPIs' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async getPayables(
    @Headers('x-tenant-id') tenantId: string,
    @Query('search') search: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    const items = await this.payableRepo.findAccountsByTenant(tenantId, search);
    const kpis = await this.payableRepo.calculateSummaryKPIs(tenantId);
    return { kpis, items };
  }

  @Post('payables')
  @RequiredModules(AppModule.BANKS)
  @RequiredPermissions('banks:write')
  @ApiOperation({ summary: 'Create Cuentas por Pagar (CxP) record' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async createPayable(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateAccountDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    const prev = Number(dto.previous_balance || 0);
    const period = Number(dto.period_amount || 0);
    const debt = prev + period;

    const acc = new AccountPayable();
    acc.tenant_id = tenantId;
    acc.provider_name = dto.entity_name;
    acc.reference_date = dto.reference_date || new Date().toISOString().split('T')[0];
    acc.notes = dto.notes;
    acc.previous_balance = prev;
    acc.period_amount = period;
    acc.total_paid = 0;
    acc.balance_due = debt;
    acc.created_by_user_id = req.user.sub;
    acc.created_by_user_name = req.user.full_name || req.user.email;

    return this.payableRepo.save(acc);
  }

  @Post('payables/:id/payments')
  @RequiredModules(AppModule.BANKS)
  @RequiredPermissions('banks:write')
  @ApiOperation({ summary: 'Register payment or formalize invoice for Cuentas por Pagar (CxP)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async registerPayablePayment(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    const account = await this.payableRepo.findAccountWithPayments(id, tenantId);
    if (!account) {
      throw new NotFoundException(`La Cuenta por Pagar con ID ${id} no existe`);
    }

    const payAmount = Number(dto.amount || dto.amount_usd || 0);
    const exRate = Number(dto.exchange_rate || 1);
    const payUsd = dto.payment_method?.includes('BS') ? payAmount / exRate : payAmount;

    const currentTotalPaid = Number(account.total_paid || 0);
    const currentBalanceDue = Number(account.balance_due || 0);
    const newTotalPaid = Number((currentTotalPaid + payUsd).toFixed(2));
    const newBalanceDue = Math.max(0, Number((currentBalanceDue - payUsd).toFixed(2)));

    account.total_paid = newTotalPaid;
    account.balance_due = newBalanceDue;
    account.status = newBalanceDue <= 0 ? AccountStatus.PAID : AccountStatus.PARTIAL;

    if (dto.supplier_invoice_number && !account.supplier_invoice_number) {
      account.supplier_invoice_number = dto.supplier_invoice_number;
      account.voucher_attachment_url = dto.voucher_attachment_url || dto.voucherAttachment || 'comprobante_adjunto.pdf';
      account.invoice_registered_by_user_name = req.user.full_name || req.user.email || 'Juana Pérez';
      account.invoice_registered_at = new Date();
      account.notes = `${account.notes || ''} [Factura Proveedor: ${dto.supplier_invoice_number}]`.trim();
    }

    return this.payableRepo.save(account);
  }

  // Legacy unified endpoint compatibility
  @Get('receivables-payables')
  @RequiredModules(AppModule.BANKS)
  @RequiredPermissions('banks:view')
  @ApiOperation({ summary: 'Get receivables or payables list (unified compatibility endpoint)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async getAccountsUnified(
    @Headers('x-tenant-id') tenantId: string,
    @Query('type') type: string = 'RECEIVABLE',
    @Query('search') search: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (type === 'PAYABLE') {
      const items = await this.payableRepo.findAccountsByTenant(tenantId, search);
      const kpis = await this.payableRepo.calculateSummaryKPIs(tenantId);
      return { kpis, items: items.map(i => ({ ...i, type: 'PAYABLE', entity_name: i.provider_name })) };
    } else {
      const items = await this.receivableRepo.findAccountsByTenant(tenantId, search);
      const kpis = await this.receivableRepo.calculateSummaryKPIs(tenantId);
      return { kpis, items: items.map(i => ({ ...i, type: 'RECEIVABLE', entity_name: i.client_name })) };
    }
  }

  @Post('receivables-payables')
  @RequiredModules(AppModule.BANKS)
  @RequiredPermissions('banks:write')
  @ApiOperation({ summary: 'Create account record (unified compatibility endpoint)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async createAccountUnified(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (dto.type === 'PAYABLE') {
      return this.createPayable(tenantId, dto, req);
    } else {
      return this.createReceivable(tenantId, dto, req);
    }
  }

  private validateTenant(tenantId: string, req: any) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
  }
}
