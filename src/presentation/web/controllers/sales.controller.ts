import { Controller, Post, Get, Param, Body, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { CreateSaleUseCase } from '../../../application/use-cases/pos/create-sale.use-case';
import { CreateSaleDto } from '../../../application/use-cases/pos/create-sale.dto';
import { SaleRepository } from '../../../infrastructure/persistence/postgresql/repositories/sale.repository';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(JwtAuthGuard, ModulesGuard)
export class SalesController {
  constructor(
    private readonly createSaleUseCase: CreateSaleUseCase,
    private readonly saleRepo: SaleRepository,
  ) {}

  @Get()
  @RequiredModules(AppModule.POS)
  @ApiOperation({ summary: 'Get sales history for the tenant' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getSales(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.saleRepo.findSalesWithCashier();
  }

  @Get(':id')
  @RequiredModules(AppModule.POS)
  @ApiOperation({ summary: 'Get sale details by ID' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getSaleDetails(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    if (!id || !isUUID(id)) {
      throw new BadRequestException('Sale ID must be a valid UUID');
    }
    const result = await this.saleRepo.findSaleDetails(id);
    if (!result) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    return result;
  }

  @Post()
  @RequiredModules(AppModule.POS)
  @ApiOperation({ summary: 'Register a POS sale and deduct products stock' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier (must match authenticated tenant)' })
  @ApiBody({ type: CreateSaleDto, description: 'Datos de la venta a registrar y productos a descontar' })
  async createSale(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateSaleDto,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    const userId = req.user.userId;
    return this.createSaleUseCase.execute(tenantId, userId, dto);
  }
}
