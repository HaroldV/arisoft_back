import { Controller, Post, Get, Param, Body, Headers, UseGuards, Req, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';
import { OpenShiftUseCase } from '../../../application/use-cases/pos/open-shift.use-case';
import { OpenShiftDto } from '../../../application/use-cases/pos/dto/open-shift.dto';
import { CloseShiftUseCase } from '../../../application/use-cases/pos/close-shift.use-case';
import { CloseShiftDto } from '../../../application/use-cases/pos/dto/close-shift.dto';
import { GetActiveShiftUseCase } from '../../../application/use-cases/pos/get-active-shift.use-case';
import { ApproveShiftUseCase } from '../../../application/use-cases/pos/approve-shift.use-case';
import { CashShiftRepository } from '../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';

@ApiTags('CashShifts')
@ApiBearerAuth()
@Controller('pos/shifts')
@UseGuards(JwtAuthGuard, ModulesGuard, PermissionsGuard)
export class CashShiftsController {
  constructor(
    private readonly openShiftUseCase: OpenShiftUseCase,
    private readonly closeShiftUseCase: CloseShiftUseCase,
    private readonly getActiveShiftUseCase: GetActiveShiftUseCase,
    private readonly approveShiftUseCase: ApproveShiftUseCase,
    private readonly cashShiftRepo: CashShiftRepository,
  ) {}

  @Get('active')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('pos:create')
  @ApiOperation({ summary: 'Get active cash shift for the cashier' })
  async getActiveShift(@Req() req: any) {
    return this.getActiveShiftUseCase.execute(req.user.id);
  }

  @Post('open')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('pos:create')
  @ApiOperation({ summary: 'Open a new cash shift' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async openShift(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
    @Body() dto: OpenShiftDto,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.openShiftUseCase.execute(tenantId, req.user.id, dto);
  }

  @Post('close')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('pos:create')
  @ApiOperation({ summary: 'Close active cash shift and declare cash counts' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async closeShift(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
    @Body() dto: CloseShiftDto,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.closeShiftUseCase.execute(tenantId, req.user.id, dto);
  }

  @Post(':id/approve')
  @RequiredModules(AppModule.POS)
  @ApiOperation({ summary: 'Approve a cash shift closure (Supervisor only)' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async approveShift(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') shiftId: string,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      throw new ForbiddenException('Solo propietarios o supervisores pueden aprobar cierres de caja');
    }
    return this.approveShiftUseCase.execute(tenantId, req.user.id, shiftId);
  }

  @Get()
  @RequiredModules(AppModule.POS)
  @ApiOperation({ summary: 'Get all cash shifts' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getShifts(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.cashShiftRepo.findAllShifts();
  }
}
