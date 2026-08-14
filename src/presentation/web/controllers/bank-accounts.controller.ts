import { Controller, Post, Get, Put, Delete, Body, Param, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID, IsUUID, IsNotEmpty, IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { BankAccountRepository } from '../../../infrastructure/persistence/typeorm/repositories/bank-account.repository';
import { BankAccount } from '../../../domain/entities/bank-account.entity';
import { BankMovement } from '../../../domain/entities/bank-movement.entity';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';

export class CreateBankAccountDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  bank_name: string;

  @IsOptional()
  @IsString()
  account_number?: string;

  @IsNotEmpty()
  @IsEnum(['CORRIENTE', 'AHORRO', 'EFECTIVO'])
  account_type: string;

  @IsNotEmpty()
  @IsEnum(['USD', 'VES'])
  currency: string;

  @IsOptional()
  @IsNumber()
  initial_balance?: number;

  @IsOptional()
  @IsString()
  p2p_phone?: string;

  @IsOptional()
  @IsString()
  p2p_tax_id?: string;

  @IsOptional()
  @IsString()
  p2p_bank_code?: string;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  account_number?: string;

  @IsOptional()
  @IsEnum(['CORRIENTE', 'AHORRO', 'EFECTIVO'])
  account_type?: string;

  @IsOptional()
  @IsEnum(['USD', 'VES'])
  currency?: string;

  @IsOptional()
  @IsString()
  p2p_phone?: string;

  @IsOptional()
  @IsString()
  p2p_tax_id?: string;

  @IsOptional()
  @IsString()
  p2p_bank_code?: string;
}

export class AdjustBalanceDto {
  @IsNotEmpty()
  @IsEnum(['DEPOSIT', 'WITHDRAWAL'])
  type: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class TransferDto {
  @IsNotEmpty()
  @IsUUID()
  fromAccountId: string;

  @IsNotEmpty()
  @IsUUID()
  toAccountId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

@ApiTags('Bank Accounts')
@ApiBearerAuth()
@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, ModulesGuard, PermissionsGuard)
export class BankAccountsController {
  constructor(
    private readonly bankAccountRepo: BankAccountRepository,
    private readonly dataSource: DataSource,
  ) {}

  @Post()
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('banks:write')
  @ApiOperation({ summary: 'Register a new bank account' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateBankAccountDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);

    const account = new BankAccount();
    account.tenant_id = tenantId;
    account.name = dto.name;
    account.bank_name = dto.bank_name;
    account.account_number = dto.account_number;
    account.account_type = dto.account_type;
    account.currency = dto.currency;
    account.current_balance = dto.initial_balance || 0;
    account.p2p_phone = dto.p2p_phone;
    account.p2p_tax_id = dto.p2p_tax_id;
    account.p2p_bank_code = dto.p2p_bank_code;

    return this.bankAccountRepo.save(account);
  }

  @Get()
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('banks:view')
  @ApiOperation({ summary: 'Get all bank accounts' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    return this.bankAccountRepo.findAll();
  }

  @Put(':id')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('banks:write')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateBankAccountDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de cuenta inválido');
    }

    const account = await this.bankAccountRepo.findById(id);
    if (!account) {
      throw new NotFoundException('Cuenta bancaria no encontrada');
    }

    if (dto.name !== undefined) account.name = dto.name;
    if (dto.bank_name !== undefined) account.bank_name = dto.bank_name;
    if (dto.account_number !== undefined) account.account_number = dto.account_number;
    if (dto.account_type !== undefined) account.account_type = dto.account_type;
    if (dto.currency !== undefined) account.currency = dto.currency;
    if (dto.p2p_phone !== undefined) account.p2p_phone = dto.p2p_phone;
    if (dto.p2p_tax_id !== undefined) account.p2p_tax_id = dto.p2p_tax_id;
    if (dto.p2p_bank_code !== undefined) account.p2p_bank_code = dto.p2p_bank_code;

    return this.bankAccountRepo.save(account);
  }

  @Delete(':id')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('banks:write')
  @ApiOperation({ summary: 'Soft delete a bank account' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async delete(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de cuenta inválido');
    }

    const account = await this.bankAccountRepo.findById(id);
    if (!account) {
      throw new NotFoundException('Cuenta bancaria no encontrada');
    }

    await this.bankAccountRepo.softDelete(id);
    return { message: 'Bank account successfully deactivated' };
  }

  @Post(':id/adjust')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('banks:transfer')
  @ApiOperation({ summary: 'Manually adjust balance (Deposit / Withdraw)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async adjustBalance(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: AdjustBalanceDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de cuenta inválido');
    }

    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(BankAccount, { where: { id, tenant_id: tenantId, is_active: true } });
      if (!account) {
        throw new NotFoundException('Cuenta bancaria no encontrada');
      }

      const adjustment = Number(dto.amount);
      if (dto.type === 'WITHDRAWAL') {
        if (Number(account.current_balance) - adjustment < 0) {
          throw new BadRequestException('Saldo insuficiente para realizar el retiro.');
        }
        account.current_balance = Number(account.current_balance) - adjustment;
      } else {
        account.current_balance = Number(account.current_balance) + adjustment;
      }

      await manager.save(BankAccount, account);

      await manager.save(BankMovement, new BankMovement({
        tenant_id: tenantId,
        account_id: id,
        type: dto.type,
        amount: dto.type === 'WITHDRAWAL' ? -adjustment : adjustment,
        reference: dto.reference,
        description: dto.description || (dto.type === 'DEPOSIT' ? 'Depósito manual' : 'Retiro manual'),
        created_by_user_id: req.user.userId,
      }));

      return account;
    });
  }

  @Post('transfer')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('banks:transfer')
  @ApiOperation({ summary: 'Transfer funds between accounts' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async transfer(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: TransferDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);

    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Las cuentas de origen y destino deben ser diferentes.');
    }

    return this.dataSource.transaction(async (manager) => {
      const fromAcc = await manager.findOne(BankAccount, { where: { id: dto.fromAccountId, tenant_id: tenantId, is_active: true } });
      const toAcc = await manager.findOne(BankAccount, { where: { id: dto.toAccountId, tenant_id: tenantId, is_active: true } });

      if (!fromAcc || !toAcc) {
        throw new NotFoundException('Una o ambas cuentas no fueron encontradas.');
      }

      if (fromAcc.currency !== toAcc.currency) {
        throw new BadRequestException('No se permiten transferencias entre diferentes monedas actualmente.');
      }

      const transferAmount = Number(dto.amount);
      if (Number(fromAcc.current_balance) - transferAmount < 0) {
        throw new BadRequestException('Saldo insuficiente en la cuenta de origen.');
      }

      fromAcc.current_balance = Number(fromAcc.current_balance) - transferAmount;
      toAcc.current_balance = Number(toAcc.current_balance) + transferAmount;

      await manager.save(BankAccount, fromAcc);
      await manager.save(BankAccount, toAcc);

      const ref = dto.reference || `TR-${Date.now()}`;

      await manager.save(BankMovement, new BankMovement({
        tenant_id: tenantId,
        account_id: fromAcc.id,
        type: 'WITHDRAWAL',
        amount: -transferAmount,
        reference: ref,
        description: dto.description || `Transferencia a ${toAcc.name}`,
        created_by_user_id: req.user.userId,
      }));

      await manager.save(BankMovement, new BankMovement({
        tenant_id: tenantId,
        account_id: toAcc.id,
        type: 'DEPOSIT',
        amount: transferAmount,
        reference: ref,
        description: dto.description || `Transferencia recibida de ${fromAcc.name}`,
        created_by_user_id: req.user.userId,
      }));

      return {
        message: 'Transferencia realizada con éxito',
        fromAccountBalance: fromAcc.current_balance,
        toAccountBalance: toAcc.current_balance,
      };
    });
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
