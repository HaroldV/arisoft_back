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
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async getRanges(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match session');
    }
    return this.getFiscalRangesUseCase.execute();
  }

  @Post()
  @ApiOperation({ summary: 'Configure or update a fiscal range' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async configureRange(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ConfigureFiscalRangeDto,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match session');
    }
    return this.configureFiscalRangeUseCase.execute(tenantId, dto);
  }
}
