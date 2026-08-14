import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder, PurchaseOrderItem } from '../../../domain/entities/purchase-order.entity';
import { Product } from '../../../domain/entities/product.entity';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const isValidUUID = (id?: string) => typeof id === 'string' && UUID_REGEX.test(id);

export interface CancelAndReplaceOrderDto {
  cancellationReason?: string;
  items: Array<{
    productId: string;
    model?: string;
    warehouseId?: string;
    quantityOrdered: number;
    unitCostUsd: number;
    discountPercentage?: number;
    discountAmount?: number;
    taxRate?: number;
    additionalTaxAmount?: number;
    lineComment?: string;
  }>;
}

@Injectable()
export class CancelAndReplacePurchaseOrderUseCase {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly orderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly itemRepository: Repository<PurchaseOrderItem>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    tenantId: string,
    userId: string,
    userName: string,
    orderIdToCancel: string,
    dto: CancelAndReplaceOrderDto,
  ): Promise<PurchaseOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find existing Purchase Order
      let oldOrder = await queryRunner.manager.findOne(PurchaseOrder, {
        where: { id: orderIdToCancel, tenant_id: tenantId },
      });

      if (!oldOrder) {
        oldOrder = await queryRunner.manager.findOne(PurchaseOrder, {
          where: { id: orderIdToCancel },
        });
      }

      if (!oldOrder) {
        throw new NotFoundException(`La Orden de Compra con ID ${orderIdToCancel} no existe`);
      }

      // 2. Mark old order as CANCELLED
      oldOrder.status = 'CANCELLED';
      await queryRunner.manager.save(PurchaseOrder, oldOrder);

      // 3. Generate new order number
      const count = await queryRunner.manager.count(PurchaseOrder, { where: { tenant_id: oldOrder.tenant_id } });
      const formattedNum = String(count + 1).padStart(10, '0');
      const newOrderNumber = `OC-${formattedNum}`;

      // 4. Calculate subtotal & tax for new items
      let subtotalUsd = 0;
      let taxAmountUsd = 0;

      const orderItemsToCreate: Partial<PurchaseOrderItem>[] = [];

      for (const [idx, i] of dto.items.entries()) {
        let targetProductId: string | undefined = undefined;
        if (isValidUUID(i.productId)) {
          const existingProduct = await queryRunner.manager.findOne(Product, {
            where: { id: i.productId, tenant_id: oldOrder.tenant_id },
          });
          if (existingProduct) {
            targetProductId = existingProduct.id;
          }
        }

        if (!targetProductId) {
          const cleanProdName = (i.lineComment || i.model || i.productId || `Producto ${idx + 1}`).trim();
          let existingProduct = await queryRunner.manager.findOne(Product, {
            where: { tenant_id: oldOrder.tenant_id, name: cleanProdName },
          });
          if (!existingProduct) {
            const generatedSku = `PROD-OC-${Date.now().toString().slice(-6)}-${idx + 1}`;
            existingProduct = queryRunner.manager.create(Product, {
              tenant_id: oldOrder.tenant_id,
              sku: generatedSku,
              name: cleanProdName,
              cost_usd: Number(i.unitCostUsd || 0),
              price_usd: Number((i.unitCostUsd * 1.3).toFixed(2)),
              unit_of_measure: 'unidades',
              current_stock: 0,
              tax_rate: i.taxRate || 16,
            });
            existingProduct = await queryRunner.manager.save(Product, existingProduct);
          }
          targetProductId = existingProduct.id;
        }

        const qty = Number(i.quantityOrdered || 1);
        const cost = Number(i.unitCostUsd || 0);
        const discPct = Number(i.discountPercentage || 0);
        const gross = qty * cost;
        const discAmt = i.discountAmount !== undefined ? Number(i.discountAmount) : (gross * discPct) / 100;
        const netLine = gross - discAmt;
        const taxRate = i.taxRate !== undefined ? Number(i.taxRate) : 16.00;
        const lineTax = (netLine * taxRate) / 100;

        subtotalUsd += netLine;
        taxAmountUsd += lineTax;

        orderItemsToCreate.push({
          product_id: targetProductId,
          model: i.model,
          warehouse_id: isValidUUID(i.warehouseId) ? i.warehouseId : undefined,
          quantity_ordered: qty,
          quantity_received: 0,
          unit_cost_usd: cost,
          discount_percentage: discPct,
          discount_amount: discAmt,
          tax_rate: taxRate,
          total_cost_usd: netLine,
          additional_tax_amount: Number(i.additionalTaxAmount || 0),
          line_comment: i.lineComment,
        });
      }

      const totalAmountUsd = subtotalUsd + taxAmountUsd;

      // 5. Create Substitute Purchase Order
      const newOrder = queryRunner.manager.create(PurchaseOrder, {
        tenant_id: oldOrder.tenant_id,
        order_number: newOrderNumber,
        supplier_id: oldOrder.supplier_id,
        supplier_name: oldOrder.supplier_name,
        supplier_rif: oldOrder.supplier_rif,
        payment_term: oldOrder.payment_term,
        currency: oldOrder.currency,
        exchange_rate: oldOrder.exchange_rate,
        is_national: oldOrder.is_national,
        status: 'SENT',
        notes: `Sustituye a OC anulada ${oldOrder.order_number}. Motivo: ${dto.cancellationReason || 'Ajuste por discrepancia en almacén'}`,
        subtotal_usd: subtotalUsd,
        tax_usd: taxAmountUsd,
        total_usd: totalAmountUsd,
        created_by_user_id: isValidUUID(userId) ? userId : undefined,
        created_by_user_name: userName,
      });

      const savedNewOrder = await queryRunner.manager.save(PurchaseOrder, newOrder);

      // 6. Save items for new order
      const itemsToSave = orderItemsToCreate.map(item =>
        queryRunner.manager.create(PurchaseOrderItem, {
          ...item,
          order_id: savedNewOrder.id,
        })
      );
      savedNewOrder.items = await queryRunner.manager.save(PurchaseOrderItem, itemsToSave);

      await queryRunner.commitTransaction();
      return savedNewOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
