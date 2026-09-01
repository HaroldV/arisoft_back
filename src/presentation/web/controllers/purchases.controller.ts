import { Controller, Get, Post, Body, Req, UseGuards, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from '../../../domain/entities/purchase-order.entity';
import { PurchaseReceptionNote } from '../../../domain/entities/purchase-reception.entity';
import { ProductCostHistory } from '../../../domain/entities/product-cost-history.entity';
import { CreatePurchaseOrderUseCase } from '../../../application/use-cases/purchases/create-purchase-order.use-case';
import { CreatePurchaseOrderDto } from '../../../application/use-cases/purchases/create-purchase-order.dto';
import { CreatePurchaseReceptionUseCase, CreatePurchaseReceptionDto } from '../../../application/use-cases/purchases/create-purchase-reception.use-case';
import { CancelAndReplacePurchaseOrderUseCase, CancelAndReplaceOrderDto } from '../../../application/use-cases/purchases/cancel-and-replace-purchase-order.use-case';
import { CancelPurchaseOrderUseCase, CancelPurchaseOrderDto } from '../../../application/use-cases/purchases/cancel-purchase-order.use-case';
import { BulkUpdatePricesUseCase, BulkUpdatePricesDto } from '../../../application/use-cases/inventory/bulk-update-prices.use-case';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly orderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseReceptionNote)
    private readonly receptionRepository: Repository<PurchaseReceptionNote>,
    @InjectRepository(ProductCostHistory)
    private readonly costHistoryRepository: Repository<ProductCostHistory>,
    private readonly createOrderUseCase: CreatePurchaseOrderUseCase,
    private readonly createReceptionUseCase: CreatePurchaseReceptionUseCase,
    private readonly cancelAndReplaceOrderUseCase: CancelAndReplacePurchaseOrderUseCase,
    private readonly cancelOrderUseCase: CancelPurchaseOrderUseCase,
    private readonly bulkUpdatePricesUseCase: BulkUpdatePricesUseCase,
  ) { }

  private getRequestContext(req: any) {
    const tenantId = req.user?.tenant_id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.headers?.['tenant-id'];
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const userName = req.user?.full_name || req.user?.email || 'Operador';
    return { tenantId, userId, userName };
  }

  @Get('orders')
  async getOrders(@Req() req: any) {
    try {
      const { tenantId } = this.getRequestContext(req);
      if (!tenantId) {
        return [];
      }
      return await this.orderRepository.find({
        where: { tenant_id: tenantId },
        relations: ['items'],
        order: { created_at: 'DESC' },
      });
    } catch (err: any) {
      console.error('Error fetching purchase orders:', err);
      return [];
    }
  }

  @Post('orders')
  async createOrder(@Req() req: any, @Body() dto: CreatePurchaseOrderDto) {
    try {
      const { tenantId, userId, userName } = this.getRequestContext(req);
      return await this.createOrderUseCase.execute(tenantId, userId, userName, dto);
    } catch (err: any) {
      console.error('Error creating purchase order:', err);
      throw err;
    }
  }

  @Post('orders/:id/cancel')
  async cancelOrder(
    @Req() req: any,
    @Param('id') orderId: string,
    @Body() dto: CancelPurchaseOrderDto,
  ) {
    try {
      const { tenantId, userId, userName } = this.getRequestContext(req);
      return await this.cancelOrderUseCase.execute(tenantId, userId, userName, orderId, dto);
    } catch (err: any) {
      console.error('Error canceling purchase order:', err);
      throw err;
    }
  }

  @Post('orders/:id/cancel-and-replace')
  async cancelAndReplaceOrder(
    @Req() req: any,
    @Param('id') orderIdToCancel: string,
    @Body() dto: CancelAndReplaceOrderDto,
  ) {
    try {
      const { tenantId, userId, userName } = this.getRequestContext(req);
      return await this.cancelAndReplaceOrderUseCase.execute(tenantId, userId, userName, orderIdToCancel, dto);
    } catch (err: any) {
      console.error('Error canceling and replacing purchase order:', err);
      throw err;
    }
  }

  @Get('receptions')
  async getReceptions(@Req() req: any) {
    const { tenantId } = this.getRequestContext(req);
    if (!tenantId) {
      return [];
    }
    return await this.receptionRepository.find({
      where: { tenant_id: tenantId },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  @Post('receptions')
  async createReception(@Req() req: any, @Body() dto: CreatePurchaseReceptionDto) {
    try {
      const { tenantId, userId, userName } = this.getRequestContext(req);
      return await this.createReceptionUseCase.execute(tenantId, userId, userName, dto);
    } catch (err: any) {
      console.error('Error creating purchase reception:', err);
      throw err;
    }
  }

  @Post('products/bulk-update-prices')
  async bulkUpdatePrices(@Req() req: any, @Body() dto: BulkUpdatePricesDto) {
    const { tenantId, userName } = this.getRequestContext(req);
    return await this.bulkUpdatePricesUseCase.execute(tenantId, userName, dto);
  }

  @Get('products/cost-history')
  async getCostHistory(@Req() req: any, @Query('productId') productId?: string) {
    const { tenantId } = this.getRequestContext(req);
    const where: any = { tenant_id: tenantId };
    if (productId) where.product_id = productId;
    return await this.costHistoryRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: 100,
    });
  }
}
