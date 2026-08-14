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
import { BulkUpdatePricesUseCase, BulkUpdatePricesDto } from '../../../application/use-cases/inventory/bulk-update-prices.use-case';

@Controller()
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
    private readonly bulkUpdatePricesUseCase: BulkUpdatePricesUseCase,
  ) { }

  @Get('purchases/orders')
  async getOrders(@Req() req: any) {
    try {
      const tenantId = req.user?.tenant_id || req.user?.tenantId;
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

  @Post('purchases/orders')
  async createOrder(@Req() req: any, @Body() dto: CreatePurchaseOrderDto) {
    try {
      const tenantId = req.user?.tenant_id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.headers?.['tenant-id'];
      const userId = req.user?.sub || req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const userName = req.user?.full_name || req.user?.email || 'Operador';
      return await this.createOrderUseCase.execute(tenantId, userId, userName, dto);
    } catch (err: any) {
      console.error('Error creating purchase order:', err);
      throw err;
    }
  }

  @Post('purchases/orders/:id/cancel-and-replace')
  async cancelAndReplaceOrder(
    @Req() req: any,
    @Param('id') orderIdToCancel: string,
    @Body() dto: CancelAndReplaceOrderDto,
  ) {
    try {
      const tenantId = req.user?.tenant_id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.headers?.['tenant-id'];
      const userId = req.user?.sub || req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const userName = req.user?.full_name || req.user?.email || 'Operador';
      return await this.cancelAndReplaceOrderUseCase.execute(tenantId, userId, userName, orderIdToCancel, dto);
    } catch (err: any) {
      console.error('Error canceling and replacing purchase order:', err);
      throw err;
    }
  }

  @Get('purchases/receptions')
  async getReceptions(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenant_id || req.user?.tenantId || '00000000-0000-0000-0000-000000000000';
    return await this.receptionRepository.find({
      where: { tenant_id: tenantId },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  @Post('purchases/receptions')
  async createReception(@Req() req: any, @Body() dto: CreatePurchaseReceptionDto) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenant_id || req.user?.tenantId || '00000000-0000-0000-0000-000000000000';
      const userId = req.user?.sub || req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const userName = req.user?.full_name || req.user?.email || 'Operador';
      return await this.createReceptionUseCase.execute(tenantId, userId, userName, dto);
    } catch (err: any) {
      console.error('Error creating purchase reception:', err);
      throw err;
    }
  }

  @Post('inventory/products/bulk-update-prices')
  async bulkUpdatePrices(@Req() req: any, @Body() dto: BulkUpdatePricesDto) {
    const tenantId = req.user.tenant_id || req.user.tenantId;
    const userName = req.user.full_name || req.user.email || 'Operador';
    return await this.bulkUpdatePricesUseCase.execute(tenantId, userName, dto);
  }

  @Get('inventory/products/cost-history')
  async getCostHistory(@Req() req: any, @Query('productId') productId?: string) {
    const tenantId = req.user.tenant_id || req.user.tenantId;
    const where: any = { tenant_id: tenantId };
    if (productId) where.product_id = productId;
    return await this.costHistoryRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: 100,
    });
  }
}
