import { Controller, Post, Get, Patch, Put, Delete, Body, Param, Query, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException, ParseArrayPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { BulkUploadProductsUseCase } from '../../../application/use-cases/inventory/bulk-upload-products.use-case';
import { RegisterPurchaseUseCase } from '../../../application/use-cases/inventory/register-purchase.use-case';
import { RegisterPurchaseNoteUseCase, RegisterPurchaseNoteDto } from '../../../application/use-cases/inventory/register-purchase-note.use-case';
import { UpdateProductUseCase } from '../../../application/use-cases/inventory/update-product.use-case';
import { DeleteProductUseCase } from '../../../application/use-cases/inventory/delete-product.use-case';
import { CreateProductDto } from '../../../application/use-cases/inventory/create-product.dto';
import { UpdateProductDto } from '../../../application/use-cases/inventory/update-product.dto';
import { RegisterPurchaseDto } from '../../../application/use-cases/inventory/register-purchase.dto';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { PurchaseInvoiceRepository } from '../../../infrastructure/persistence/typeorm/repositories/purchase-invoice.repository';
import { PurchaseFiscalNoteRepository } from '../../../infrastructure/persistence/typeorm/repositories/purchase-fiscal-note.repository';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';

import { StockSnapshotService } from '../../../application/services/stock-snapshot.service';

import * as fs from 'fs';
import * as path from 'path';

import { StockMoveRepository } from '../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { CreateStockAdjustmentUseCase, CreateStockAdjustmentDto, CreateStockTransferDto } from '../../../application/use-cases/inventory/create-stock-adjustment.use-case';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, ModulesGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly bulkUploadUseCase: BulkUploadProductsUseCase,
    private readonly registerPurchaseUseCase: RegisterPurchaseUseCase,
    private readonly registerPurchaseNoteUseCase: RegisterPurchaseNoteUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly createStockAdjustmentUseCase: CreateStockAdjustmentUseCase,
    private readonly productRepo: ProductRepository,
    private readonly purchaseInvoiceRepo: PurchaseInvoiceRepository,
    private readonly purchaseFiscalNoteRepo: PurchaseFiscalNoteRepository,
    private readonly stockMoveRepo: StockMoveRepository,
    private readonly snapshotService: StockSnapshotService,
  ) {}

  @Post('products/upload-image')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:write')
  @ApiOperation({ summary: 'Upload product image and store in tenant/category structured folder' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async uploadProductImage(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { image_base64: string; filename?: string; category_name?: string },
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (!body.image_base64) {
      throw new BadRequestException('Se requiere la imagen codificada en base64');
    }

    const categoryFolder = (body.category_name || 'general')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_');

    // Create target directory: uploads/tenants/${tenantId}/${categoryFolder}/
    const uploadDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId, categoryFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Clean base64 string
    const matches = body.image_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const base64Data = matches ? matches[2] : body.image_base64;
    const extension = matches ? (matches[1].split('/')[1] || 'jpg') : 'jpg';

    const timestamp = Date.now();
    const savedFilename = `img_${timestamp}.${extension}`;
    const filePath = path.join(uploadDir, savedFilename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const relativeUrl = `http://localhost:4000/uploads/tenants/${tenantId}/${categoryFolder}/${savedFilename}`;

    return {
      success: true,
      url: relativeUrl,
      filename: savedFilename,
      category_folder: categoryFolder,
    };
  }

  @Get('snapshots')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:view')
  @ApiOperation({ summary: 'Get historical stock valuation snapshots report' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getStockSnapshots(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('exchange_rate') exchangeRate?: number,
    @Query('search') search?: string,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.snapshotService.getValuationReport(tenantId, startDate, endDate, exchangeRate, search);
  }

  @Post('snapshots/trigger')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:write')
  @ApiOperation({ summary: 'Manually trigger current day stock snapshot creation' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async triggerDailySnapshot(
    @Headers('x-tenant-id') tenantId: string,
    @Body('exchange_rate') exchangeRate: number,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    const userName = req.user.full_name || req.user.email || 'Usuario ERP';
    return this.snapshotService.generateDailySnapshot(tenantId, exchangeRate || 36.50, userName);
  }

  @Get('products')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:view')
  @ApiOperation({ summary: 'Get products of the tenant with dynamic stocks balance' })
  @ApiHeader({ name: 'x-tenant-id', required: false, description: 'Tenant Identifier' })
  @ApiQuery({ name: 'sku', required: false, description: 'Filtrar por SKU exacto' })
  @ApiQuery({ name: 'name', required: false, description: 'Filtrar por coincidencia parcial de nombre' })
  async getProducts(
    @Headers('x-tenant-id') headerTenantId: string,
    @Req() req: any,
    @Query('sku') sku?: string,
    @Query('name') name?: string,
  ) {
    this.validateTenant(headerTenantId, req);
    return this.productRepo.findProductsWithStock({ sku, name });
  }

  @Get('purchases')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:view')
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
  @RequiredPermissions('inventory:view')
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
  @RequiredPermissions('inventory:write')
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
    const user = { id: req.user.sub || req.user.userId, name: req.user.full_name || req.user.email };
    return this.bulkUploadUseCase.execute(tenantId, products, user);
  }

  @Post('purchases')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('purchases:register')
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

  @Put('products/:id')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:write')
  @ApiOperation({ summary: 'Update a product with PUT (respecting lifecycle rules)' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  @ApiBody({ type: UpdateProductDto, description: 'Datos parciales del producto a actualizar' })
  async updateProductPut(
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
    const user = { id: req.user.sub || req.user.userId, name: req.user.full_name || req.user.email };
    return this.updateProductUseCase.execute(id, dto, user);
  }

  @Patch('products/:id')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:write')
  @ApiOperation({ summary: 'Update a product with PATCH (respecting lifecycle rules)' })
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
    const user = { id: req.user.sub || req.user.userId, name: req.user.full_name || req.user.email };
    return this.updateProductUseCase.execute(id, dto, user);
  }

  @Delete('products/:id')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:write')
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

  @Get('purchases/notes')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:view')
  @ApiOperation({ summary: 'Get purchase notes history for the tenant' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getPurchaseNotes(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.purchaseFiscalNoteRepo.findNotesList();
  }

  @Get('purchases/notes/:id')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:view')
  @ApiOperation({ summary: 'Get purchase note details by ID' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getPurchaseNoteDetails(
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
      throw new BadRequestException('Note ID must be a valid UUID');
    }
    const result = await this.purchaseFiscalNoteRepo.findNoteDetails(id);
    if (!result) {
      throw new NotFoundException(`Purchase Note with ID ${id} not found`);
    }
    return result;
  }

  @Post('purchases/notes')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('purchases:register')
  @ApiOperation({ summary: 'Register a purchase note (Credit/Debit)' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async registerPurchaseNote(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: RegisterPurchaseNoteDto,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    const userId = req.user.userId;
    const ipAddress = req.ip || '127.0.0.1';
    return this.registerPurchaseNoteUseCase.execute(tenantId, userId, ipAddress, dto);
  }

  @Get('moves')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:view')
  @ApiOperation({ summary: 'Get Kardex inventory stock movements list' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async getStockMoves(
    @Headers('x-tenant-id') tenantId: string,
    @Query('product_id') productId?: string,
    @Query('type') type?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Req() req?: any,
  ) {
    const validTenantId = this.validateTenant(tenantId, req);
    return this.stockMoveRepo.findAllFiltered({
      productId,
      type,
      startDate,
      endDate,
    });
  }

  @Post('moves/adjustment')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:adjust')
  @ApiOperation({ summary: 'Create manual stock adjustment or initial load' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async createStockAdjustment(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateStockAdjustmentDto,
    @Req() req: any,
  ) {
    try {
      const validTenantId = this.validateTenant(tenantId, req);
      const userId = req.user?.userId || req.user?.id || req.user?.sub;
      return await this.createStockAdjustmentUseCase.execute(validTenantId, userId, dto);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error in createStockAdjustment:', error);
      let userMsg = 'Error al procesar el ajuste de inventario.';
      if (error.message && error.message.includes('warehouse_location_id')) {
        userMsg = 'La columna de ubicación de almacén se está actualizando en el esquema de base de datos. Por favor reintente.';
      } else if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        userMsg = 'Ocurrió un error en la tabla de datos del inventario.';
      }
      throw new BadRequestException(userMsg);
    }
  }

  @Post('moves/transfer')
  @RequiredModules(AppModule.INVENTORY)
  @RequiredPermissions('inventory:adjust')
  @ApiOperation({ summary: 'Create stock transfer between warehouse locations' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async createStockTransfer(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateStockTransferDto,
    @Req() req: any,
  ) {
    try {
      const validTenantId = this.validateTenant(tenantId, req);
      const userId = req.user?.userId || req.user?.id || req.user?.sub;
      return await this.createStockAdjustmentUseCase.executeTransfer(validTenantId, userId, dto);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error in createStockTransfer:', error);
      let userMsg = 'Error al procesar la transferencia de inventario.';
      if (error.message && error.message.includes('warehouse_location_id')) {
        userMsg = 'La columna de ubicación de almacén se está actualizando en el esquema de base de datos. Por favor reintente.';
      }
      throw new BadRequestException(userMsg);
    }
  }

  private validateTenant(tenantId: string, req: any): string {
    const resolvedTenantId = tenantId || req.user?.tenant_id || req.headers?.['x-tenant-id'];
    if (!resolvedTenantId || !isUUID(resolvedTenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (req.user?.tenant_id && resolvedTenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return resolvedTenantId;
  }
}
