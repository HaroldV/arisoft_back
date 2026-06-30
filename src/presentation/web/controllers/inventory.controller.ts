import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException, ParseArrayPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { BulkUploadProductsUseCase } from '../../../application/use-cases/inventory/bulk-upload-products.use-case';
import { RegisterPurchaseUseCase } from '../../../application/use-cases/inventory/register-purchase.use-case';
import { UpdateProductUseCase } from '../../../application/use-cases/inventory/update-product.use-case';
import { DeleteProductUseCase } from '../../../application/use-cases/inventory/delete-product.use-case';
import { CreateProductDto } from '../../../application/use-cases/inventory/create-product.dto';
import { UpdateProductDto } from '../../../application/use-cases/inventory/update-product.dto';
import { RegisterPurchaseDto } from '../../../application/use-cases/inventory/register-purchase.dto';
import { ProductRepository } from '../../../infrastructure/persistence/postgresql/repositories/product.repository';
import { PurchaseInvoiceRepository } from '../../../infrastructure/persistence/postgresql/repositories/purchase-invoice.repository';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, ModulesGuard)
export class InventoryController {
  constructor(
    private readonly bulkUploadUseCase: BulkUploadProductsUseCase,
    private readonly registerPurchaseUseCase: RegisterPurchaseUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly productRepo: ProductRepository,
    private readonly purchaseInvoiceRepo: PurchaseInvoiceRepository,
  ) {}

  @Get('products')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Get products of the tenant with dynamic stocks balance' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  @ApiQuery({ name: 'sku', required: false, description: 'Filtrar por SKU exacto' })
  @ApiQuery({ name: 'name', required: false, description: 'Filtrar por coincidencia parcial de nombre' })
  async getProducts(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
    @Query('sku') sku?: string,
    @Query('name') name?: string,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.productRepo.findProductsWithStock({ sku, name });
  }

  @Get('purchases')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Get purchase history for the tenant' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getPurchases(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.purchaseInvoiceRepo.findPurchasesWithCreator();
  }

  @Get('purchases/:id')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Get purchase invoice details by ID' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getPurchaseDetails(
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
      throw new BadRequestException('Purchase ID must be a valid UUID');
    }
    const result = await this.purchaseInvoiceRepo.findPurchaseDetails(id);
    if (!result) {
      throw new NotFoundException(`Purchase invoice with ID ${id} not found`);
    }
    return result;
  }

  @Post('products')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Create products and initialize stock' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier (must match authenticated tenant)' })
  @ApiBody({ type: [CreateProductDto], description: 'Listado de productos a registrar con su stock inicial' })
  async createProduct(
    @Headers('x-tenant-id') tenantId: string,
    @Body(new ParseArrayPipe({ items: CreateProductDto })) products: CreateProductDto[],
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.bulkUploadUseCase.execute(tenantId, products);
  }

  @Post('purchases')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Register a purchase invoice and incoming stock moves' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier (must match authenticated tenant)' })
  @ApiBody({ type: RegisterPurchaseDto, description: 'Datos de la factura de compra y productos a ingresar' })
  async registerPurchase(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: RegisterPurchaseDto,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    const userId = req.user.userId;
    return this.registerPurchaseUseCase.execute(tenantId, userId, dto);
  }

  @Patch('products/:id')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Update a product (respecting lifecycle rules)' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  @ApiBody({ type: UpdateProductDto, description: 'Datos parciales del producto a actualizar' })
  async updateProduct(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateProductDto,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    if (!id || !isUUID(id)) {
      throw new BadRequestException('Product ID must be a valid UUID');
    }
    return this.updateProductUseCase.execute(id, dto);
  }

  @Delete('products/:id')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Soft delete a product (only if no sales history)' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async deleteProduct(
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
      throw new BadRequestException('Product ID must be a valid UUID');
    }
    await this.deleteProductUseCase.execute(id);
    return { message: 'Product successfully deleted' };
  }
}
