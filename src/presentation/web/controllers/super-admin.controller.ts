import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Req, 
  UseGuards, 
  BadRequestException, 
  ForbiddenException, 
  NotFoundException, 
  ConflictException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../../infrastructure/auth/decorators/roles.decorator';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { Product } from '../../../domain/entities/product.entity';
import { AuthService } from '../../../application/use-cases/auth/auth.service';
import { ExchangeRateService } from '../../../infrastructure/finance/exchange-rate.service';
import { isUUID } from 'class-validator';
import { SaasPlan } from '../../../domain/entities/saas-plan.entity';

import { SaasPlanManagementUseCase } from '../../../application/use-cases/admin/saas-plan-management.use-case';
import { TenantStatusEnum, SaasPlanEnum, BACKEND_SYSTEM_CONSTANTS, PLAN_DEFAULT_MODULES, PLAN_DEFAULT_PERMISSIONS } from '../../../domain/constants/domain.constants';
import { RifValidator } from '../../../domain/utils/rif-validator.util';
import { EmailValidator } from '../../../domain/utils/email-validator.util';

import { ApproveSubscriptionPaymentUseCase } from '../../../application/use-cases/admin/approve-subscription-payment.use-case';
import { SubscriptionPaymentReceipt, SubscriptionPaymentStatusEnum } from '../../../domain/entities/subscription-payment-receipt.entity';

import { ExchangeRateHistoryRepository } from '../../../infrastructure/persistence/typeorm/repositories/exchange-rate-history.repository';

@ApiTags('Super Admin Backoffice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class SuperAdminController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly exchangeRateHistoryRepository: ExchangeRateHistoryRepository,
    private readonly saasPlanManagementUseCase: SaasPlanManagementUseCase,
    private readonly approveSubscriptionPaymentUseCase: ApproveSubscriptionPaymentUseCase,
  ) {}

  // ─── CRUD DE PLANES SAAS (Delegado a SaasPlanManagementUseCase) ─────────────

  @Get('plans')
  @ApiOperation({ summary: 'List all SaaS plans (with automatic initial seeding)' })
  async listPlans() {
    return this.saasPlanManagementUseCase.listPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new SaaS subscription plan' })
  async createPlan(@Body() body: any) {
    return this.saasPlanManagementUseCase.createPlan(body);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update an existing SaaS subscription plan' })
  async updatePlan(@Param('id') id: string, @Body() body: any) {
    return this.saasPlanManagementUseCase.updatePlan(id, body);
  }

  @Put('plans/:id/status')
  @ApiOperation({ summary: 'Toggle plan active status' })
  async togglePlanStatus(@Param('id') id: string, @Body() body: any) {
    return this.saasPlanManagementUseCase.togglePlanStatus(id, body?.is_active);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants for platform backoffice' })
  async listTenants() {
    const tenants = await this.dataSource.getRepository(Tenant).find({
      order: { created_at: 'DESC' }
    });

    const result = [];
    for (const tenant of tenants) {
      const userCount = await this.dataSource.getRepository(User).count({
        where: { tenant_id: tenant.id }
      });
      const inactiveUserCount = await this.dataSource.getRepository(User).count({
        where: { tenant_id: tenant.id, is_active: false }
      });
      const productCount = await this.dataSource.getRepository(Product).count({
        where: { tenant_id: tenant.id }
      });
      const ownerUser = await this.dataSource.getRepository(User).findOne({
        where: { tenant_id: tenant.id, role: UserRole.OWNER }
      });

      result.push({
        id: tenant.id,
        name: tenant.company_name,
        tax_id: tenant.tax_id,
        subdomain: tenant.settings?.subdomain || tenant.company_name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        plan_name: tenant.plan_type || 'COMERCIAL_PRO',
        status: tenant.is_active ? 'ACTIVE' : 'SUSPENDED',
        user_count: userCount,
        inactive_user_count: inactiveUserCount,
        max_users: tenant.settings?.max_users || 10,
        product_count: productCount,
        max_products: tenant.settings?.max_products || 2500,
        monthly_fee_usd: tenant.settings?.monthly_fee_usd || 35.00,
        subscription_expires_at: tenant.trial_expires_at ? new Date(tenant.trial_expires_at).toISOString().split('T')[0] : '2026-12-31',
        created_at: tenant.created_at ? new Date(tenant.created_at).toISOString().split('T')[0] : '',
        enabled_modules: tenant.settings?.enabled_modules || ['POS', 'SALES', 'INVENTORY', 'BANKS', 'REPORTS'],
        enabled_permissions: tenant.settings?.enabled_permissions || [
          'pos:create', 'sales:invoicing', 'sales:quotations', 'sales:orders', 'sales:deliveries', 'clients:manage', 'pos:shifts',
          'purchases:orders', 'purchases:receptions', 'purchases:new', 'purchases:invoices', 'providers:manage',
          'inventory:create', 'inventory:stock', 'inventory:bulk_prices', 'inventory:valuation', 'inventory:warehouse', 'inventory:categories', 'inventory:moves',
          'banks:accounts', 'accounts:receivables', 'accounts:payables', 'accounts:history',
          'reports:view',
          'company:manage', 'fiscal:manage', 'users:manage'
        ],
        owner_email: ownerUser?.email || tenant.settings?.owner_email || '',
        owner_name: ownerUser?.full_name || tenant.settings?.owner_name || '',
        owner_is_active: ownerUser ? ownerUser.is_active : true,
        owner_failed_attempts: ownerUser ? ownerUser.failed_login_attempts : 0,
      });
    }

    return result;
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Register a new tenant company' })
  async createTenant(@Body() body: any) {
    const {
      name,
      tax_id,
      subdomain,
      plan_name,
      status,
      max_users,
      max_products,
      monthly_fee_usd,
      owner_email,
      owner_name,
      enabled_modules,
      enabled_permissions
    } = body;

    if (!name || !tax_id || !owner_email) {
      throw new BadRequestException('Name, Tax ID, and Owner Email are required');
    }

    // 1. Validar Algoritmo SENIAT Modulo 11 en RIF
    const rifResult = RifValidator.validate(tax_id);
    if (!rifResult.isValid) {
      throw new BadRequestException(`RIF inválido: ${rifResult.error}`);
    }

    // 2. Validar Sintaxis y Dominio MX en Email
    const emailResult = await EmailValidator.validate(owner_email);
    if (!emailResult.isValidSyntax || !emailResult.hasValidMx) {
      throw new BadRequestException(`Email inválido: ${emailResult.error}`);
    }

    const cleanTaxId = rifResult.formattedRif;
    const cleanEmail = owner_email.toLowerCase().trim();

    return this.dataSource.transaction(async (manager) => {
      const existingTenant = await manager.findOne(Tenant, { where: { tax_id: cleanTaxId } });
      if (existingTenant) {
        throw new ConflictException(`Company with RIF ${cleanTaxId} is already registered`);
      }

      const existingUser = await manager.findOne(User, { where: { email: cleanEmail } });
      if (existingUser) {
        throw new ConflictException(`User with email ${cleanEmail} is already registered`);
      }

      // Create Tenant
      const tenant = new Tenant();
      tenant.company_name = name;
      tenant.tax_id = cleanTaxId;
      tenant.plan_type = plan_name || SaasPlanEnum.COMERCIAL_PRO;
      
      const trialDays = status === TenantStatusEnum.TRIAL ? BACKEND_SYSTEM_CONSTANTS.TRIAL_DAYS_STANDARD : BACKEND_SYSTEM_CONSTANTS.ANNUAL_DAYS_STANDARD;
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);
      tenant.trial_expires_at = trialExpiresAt;
      tenant.is_active = status !== TenantStatusEnum.SUSPENDED;
      
      const selectedPlan = (plan_name as SaasPlanEnum) || SaasPlanEnum.COMERCIAL_PRO;
      const defaultPlanModules = PLAN_DEFAULT_MODULES[selectedPlan] || PLAN_DEFAULT_MODULES[SaasPlanEnum.COMERCIAL_PRO];
      const defaultPlanPermissions = PLAN_DEFAULT_PERMISSIONS[selectedPlan] || PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.COMERCIAL_PRO];
      const planLimits = BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS[selectedPlan] || BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS.COMERCIAL_PRO;

      tenant.settings = {
        subdomain: subdomain || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        max_users: Number(max_users || planLimits.USERS),
        max_products: Number(max_products || planLimits.PRODUCTS),
        monthly_fee_usd: Number(monthly_fee_usd || planLimits.FEE_USD),
        enabled_modules: enabled_modules || defaultPlanModules,
        enabled_permissions: enabled_permissions || defaultPlanPermissions,
        owner_email: cleanEmail,
        owner_name: owner_name || BACKEND_SYSTEM_CONSTANTS.DEFAULT_OWNER_NAME
      };

      const savedTenant = await manager.save(Tenant, tenant);

      // Create User Owner with default password from constant
      const defaultPassword = BACKEND_SYSTEM_CONSTANTS.DEFAULT_PASSWORD_ONBOARDING;
      const passwordHash = await this.authService.hashPassword(defaultPassword);

      const user = new User({
        tenant_id: savedTenant.id,
        full_name: owner_name || BACKEND_SYSTEM_CONSTANTS.DEFAULT_OWNER_NAME,
        email: cleanEmail,
        password_hash: passwordHash,
        role: UserRole.OWNER,
        is_active: true,
        is_temporary_password: true,
        allowed_permissions: tenant.settings.enabled_permissions
      });

      await manager.save(User, user);

      return {
        message: BACKEND_SYSTEM_CONSTANTS.MESSAGES.TENANT_CREATED,
        tenantId: savedTenant.id,
        defaultPassword
      };
    });
  }

  @Post('tenants/:id/reactivate-owner')
  @ApiOperation({ summary: 'Reactivate tenant owner account and reset failed attempts' })
  async reactivateOwner(@Param('id') id: string) {
    if (!isUUID(id)) {
      throw new BadRequestException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.INVALID_UUID);
    }

    const tenant = await this.dataSource.getRepository(Tenant).findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.TENANT_NOT_FOUND);
    }

    if (!tenant.is_active) {
      tenant.is_active = true;
      await this.dataSource.getRepository(Tenant).save(tenant);
    }

    let ownerUser = await this.dataSource.getRepository(User).findOne({
      where: { tenant_id: id, role: UserRole.OWNER }
    });

    if (!ownerUser) {
      ownerUser = await this.dataSource.getRepository(User).findOne({
        where: { tenant_id: id }
      });
    }

    if (!ownerUser) {
      throw new NotFoundException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.OWNER_NOT_FOUND);
    }

    ownerUser.is_active = true;
    ownerUser.failed_login_attempts = 0;
    await this.dataSource.getRepository(User).save(ownerUser);

    return { 
      message: BACKEND_SYSTEM_CONSTANTS.MESSAGES.OWNER_REACTIVATED(ownerUser.email), 
      owner_email: ownerUser.email, 
      owner_name: ownerUser.full_name 
    };
  }

  @Put('tenants/:id')
  @ApiOperation({ summary: 'Update tenant registration and subscription' })
  async updateTenant(@Param('id') id: string, @Body() body: any) {
    if (!isUUID(id)) {
      throw new BadRequestException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.INVALID_UUID);
    }

    const tenant = await this.dataSource.getRepository(Tenant).findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.TENANT_NOT_FOUND);
    }

    const {
      name,
      tax_id,
      subdomain,
      plan_name,
      status,
      max_users,
      max_products,
      monthly_fee_usd,
      owner_email,
      owner_name,
      enabled_modules,
      enabled_permissions
    } = body;

    tenant.company_name = name || tenant.company_name;
    tenant.tax_id = tax_id ? tax_id.toUpperCase().trim() : tenant.tax_id;
    tenant.plan_type = plan_name || tenant.plan_type;
    tenant.is_active = status !== TenantStatusEnum.SUSPENDED;

    if (status === TenantStatusEnum.ACTIVE && new Date() >= new Date(tenant.trial_expires_at)) {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + BACKEND_SYSTEM_CONSTANTS.SUBSCRIPTION_RENEWAL_DAYS);
      tenant.trial_expires_at = newExpiry;
    }

    tenant.settings = {
      ...(tenant.settings || {}),
      subdomain: subdomain || tenant.settings?.subdomain,
      max_users: max_users !== undefined ? Number(max_users) : tenant.settings?.max_users,
      max_products: max_products !== undefined ? Number(max_products) : tenant.settings?.max_products,
      monthly_fee_usd: monthly_fee_usd !== undefined ? Number(monthly_fee_usd) : tenant.settings?.monthly_fee_usd,
      enabled_modules: enabled_modules || tenant.settings?.enabled_modules,
      enabled_permissions: enabled_permissions || tenant.settings?.enabled_permissions,
      owner_email: owner_email ? owner_email.toLowerCase().trim() : tenant.settings?.owner_email,
      owner_name: owner_name || tenant.settings?.owner_name
    };

    let defaultPasswordReset: string | undefined = undefined;
    const targetEmail = owner_email ? owner_email.toLowerCase().trim() : tenant.settings?.owner_email?.toLowerCase().trim();

    let ownerUser: User | null = null;

    if (targetEmail) {
      ownerUser = await this.dataSource.getRepository(User).findOne({
        where: { email: targetEmail }
      });
    }

    if (!ownerUser) {
      ownerUser = await this.dataSource.getRepository(User).findOne({
        where: { tenant_id: tenant.id, role: UserRole.OWNER }
      });
    }

    if (!ownerUser) {
      ownerUser = await this.dataSource.getRepository(User).findOne({
        where: { tenant_id: tenant.id }
      });
    }

    if (ownerUser) {
      if (owner_email) ownerUser.email = owner_email.toLowerCase().trim();
      if (owner_name) ownerUser.full_name = owner_name;
      if (enabled_permissions && Array.isArray(enabled_permissions)) {
        ownerUser.allowed_permissions = enabled_permissions;
      }
      if (body.reset_password === true) {
        defaultPasswordReset = BACKEND_SYSTEM_CONSTANTS.DEFAULT_PASSWORD_ONBOARDING;
        ownerUser.password_hash = await this.authService.hashPassword(defaultPasswordReset);
        ownerUser.is_temporary_password = true;
      }
      // Sincronizar el estado del usuario Owner con el estado de la empresa (ACTIVE vs SUSPENDED)
      if (status === TenantStatusEnum.SUSPENDED) {
        ownerUser.is_active = false;
      } else {
        ownerUser.is_active = true;
        ownerUser.failed_login_attempts = 0;
      }
      await this.dataSource.getRepository(User).save(ownerUser);
    }

    return { 
      message: BACKEND_SYSTEM_CONSTANTS.MESSAGES.TENANT_UPDATED,
      defaultPassword: defaultPasswordReset
    };
  }

  @Post('tenants/:id/impersonate')
  @ApiOperation({ summary: 'Login as tenant owner for support backoffice' })
  async impersonateTenant(@Param('id') id: string) {
    if (!isUUID(id)) {
      throw new BadRequestException('Invalid tenant ID format');
    }

    const tenant = await this.dataSource.getRepository(Tenant).findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let user = await this.dataSource.getRepository(User).findOne({
      where: { tenant_id: tenant.id, role: UserRole.OWNER }
    });

    if (!user) {
      user = await this.dataSource.getRepository(User).findOne({
        where: { tenant_id: tenant.id }
      });
    }

    if (!user) {
      throw new NotFoundException('No active users found for this tenant');
    }

    const resolvedPermissions = [
      'pos:create', 'pos:discount', 'pos:refund', 'clients:manage',
      'inventory:view', 'inventory:write', 'inventory:adjust', 'purchases:register', 'providers:manage',
      'banks:view', 'banks:write', 'banks:transfer',
      'users:manage', 'fiscal:manage', 'company:manage',
      'sales:view', 'sales:write'
    ];

    const enabledModules = tenant.settings?.enabled_modules || ['POS', 'SALES', 'INVENTORY', 'BANKS', 'REPORTS'];

    const accessToken = await this.authService.generateAccessToken(user, enabledModules, resolvedPermissions);
    const refreshToken = await this.authService.generateRefreshToken(user);

    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
        enabled_modules: enabledModules,
        permissions: resolvedPermissions,
        trial_days_left: 90
      },
      access_token: accessToken,
      refresh_token: refreshToken
    };
  }

  @Get('bcv/rate')
  @ApiOperation({ summary: 'Obtener las Tasas Maestras Globales BCV (USD / EUR) actualmente vigentes' })
  async getMasterBcvRate() {
    return this.exchangeRateService.getCurrentMasterRate();
  }

  @Get('bcv/history')
  @ApiOperation({ summary: 'Obtener el historial de cambios de tasas de cambio oficial' })
  async getExchangeRateHistory() {
    return this.exchangeRateHistoryRepository.findRecent(50);
  }

  @Post('bcv/sync')
  @ApiOperation({ summary: 'Trigger manual exchange rate sync via live BCV web scraping (USD y EUR)' })
  async syncBcvRate() {
    const rateData = await this.exchangeRateService.getOfficialBcvRate();
    return {
      rates: rateData,
      USD: rateData.USD,
      EUR: rateData.EUR,
      source: rateData.source,
      updated_at: rateData.updated_at,
      value_date: rateData.value_date,
      execution_slot: rateData.execution_slot,
      timestamp: new Date().toISOString(),
      message: `Tasas sincronizadas: USD Bs. ${rateData.USD.rate.toFixed(2)} | EUR Bs. ${rateData.EUR.rate.toFixed(2)}`,
    };
  }

  @Post('bcv/manual')
  @ApiOperation({ summary: 'Registrar o corregir manualmente las Tasas Maestras Globales BCV (USD / EUR)' })
  async setManualBcvRate(@Body() body: any) {
    const usdRate = body?.usd_rate !== undefined ? Number(body.usd_rate) : (body?.rate !== undefined ? Number(body.rate) : undefined);
    const eurRate = body?.eur_rate !== undefined ? Number(body.eur_rate) : undefined;
    const valueDate = body?.value_date;
    const note = body?.note;

    if (usdRate !== undefined && (isNaN(usdRate) || usdRate <= 0)) {
      throw new BadRequestException('La tasa USD debe ser un número positivo mayor a cero (ej. 772.54)');
    }
    if (eurRate !== undefined && (isNaN(eurRate) || eurRate <= 0)) {
      throw new BadRequestException('La tasa EUR debe ser un número positivo mayor a cero (ej. 894.49)');
    }

    const saved = await this.exchangeRateService.setManualMasterRate({ usdRate, eurRate }, valueDate, note);
    return {
      rates: saved,
      USD: saved.USD,
      EUR: saved.EUR,
      source: saved.source,
      updated_at: saved.updated_at,
      value_date: saved.value_date,
      message: `Tasas Maestras actualizadas manualmente: USD Bs. ${saved.USD.rate.toFixed(2)} | EUR Bs. ${saved.EUR.rate.toFixed(2)}`,
    };
  }

  @Get('subscription/payments')
  @ApiOperation({ summary: 'Listar solicitudes de pago de suscripción para validación' })
  async listSubscriptionPayments() {
    try {
      return await this.dataSource.getRepository(SubscriptionPaymentReceipt).find({
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      console.warn('⚠️ No se pudieron consultar recibos de suscripción:', error);
      return [];
    }
  }

  @Post('subscription/payments/:id/approve')
  @ApiOperation({ summary: 'Aprobar pago de suscripción y activar la empresa' })
  async approveSubscriptionPayment(@Param('id') id: string, @Req() req: any) {
    const adminUserId = req.user?.id;
    return await this.approveSubscriptionPaymentUseCase.execute(id, adminUserId);
  }

  @Post('subscription/payments/:id/reject')
  @ApiOperation({ summary: 'Rechazar pago de suscripción con motivo de observación' })
  async rejectSubscriptionPayment(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const reason = body.rejection_reason || 'Pago rechazado o datos incompletos.';
    const adminUserId = req.user?.id || 'SUPER_ADMIN';

    const repo = this.dataSource.getRepository(SubscriptionPaymentReceipt);
    const receipt = await repo.findOne({ where: { id } });
    if (!receipt) {
      throw new BadRequestException('Recibo de pago no encontrado.');
    }

    receipt.status = SubscriptionPaymentStatusEnum.REJECTED;
    receipt.rejection_reason = reason;
    receipt.reviewed_at = new Date();
    receipt.reviewed_by_user_id = adminUserId;

    return await repo.save(receipt);
  }
}
