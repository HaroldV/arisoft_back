import { Controller, Get, Post, Body, Headers, Req, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { GetFiscalRangesUseCase } from '../../../application/use-cases/tenant/get-fiscal-ranges.use-case';
import { ConfigureFiscalRangeUseCase } from '../../../application/use-cases/tenant/configure-fiscal-range.use-case';
import { ConfigureFiscalRangeDto } from '../../../application/use-cases/tenant/dto/configure-fiscal-range.dto';

@ApiTags('Tenant Fiscal Control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant/fiscal-ranges')
export class FiscalRangesController {
  constructor(
    private readonly getFiscalRangesUseCase: GetFiscalRangesUseCase,
    private readonly configureFiscalRangeUseCase: ConfigureFiscalRangeUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get configured fiscal ranges for the tenant' })
  @ApiHeader({ name: 'x-tenant-id', required: false })
  async getRanges(
    @Headers('x-tenant-id') headerTenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(headerTenantId, req);
    return this.getFiscalRangesUseCase.execute();
  }

  @Post()
  @ApiOperation({ summary: 'Configure or update a fiscal range' })
  @ApiHeader({ name: 'x-tenant-id', required: false })
  async configureRange(
    @Headers('x-tenant-id') headerTenantId: string,
    @Body() dto: ConfigureFiscalRangeDto,
    @Req() req: any,
  ) {
    const tenantId = this.validateTenant(headerTenantId, req);
    return this.configureFiscalRangeUseCase.execute(tenantId, dto);
  }

  private validateTenant(tenantId: string, req: any): string {
    const resolvedTenantId = tenantId || req.user?.tenant_id || req.headers?.['x-tenant-id'];
    if (!resolvedTenantId || !isUUID(resolvedTenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (req.user?.tenant_id && resolvedTenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match session');
    }
    return resolvedTenantId;
  }
}
