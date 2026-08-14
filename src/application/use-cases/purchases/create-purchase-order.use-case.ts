import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder, PurchaseOrderItem } from '../../../domain/entities/purchase-order.entity';
import { Provider } from '../../../domain/entities/provider.entity';
import { Product } from '../../../domain/entities/product.entity';
import { User } from '../../../domain/entities/user.entity';
import { WarehouseLocation } from '../../../domain/entities/warehouse-location.entity';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const isValidUUID = (id?: string) => typeof id === 'string' && UUID_REGEX.test(id);

@Injectable()
export class CreatePurchaseOrderUseCase {
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
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Tenant ID Validation
      let validTenantId = isValidUUID(tenantId) ? tenantId : undefined;
      if (!validTenantId) {
        const firstTenant = await queryRunner.manager.findOne(Tenant, { where: {} });
        if (firstTenant) {
          validTenantId = firstTenant.id;
        }
      }

      // 1. Foreign Key Provider Validation
      let validSupplierId: string | undefined = undefined;
      if (isValidUUID(dto.supplierId)) {
        const existingProvider = await queryRunner.manager.findOne(Provider, {
          where: { id: dto.supplierId, tenant_id: validTenantId },
        });
        if (existingProvider) {
          validSupplierId = existingProvider.id;
        }
      }

      if (!validSupplierId && dto.supplierRif) {
        const cleanRif = dto.supplierRif.trim().toUpperCase();
        const cleanName = dto.supplierName ? dto.supplierName.trim() : 'Proveedor General';

        let provider = await queryRunner.manager.findOne(Provider, {
          where: { tenant_id: validTenantId, tax_id: cleanRif },
        });

        if (!provider) {
          provider = queryRunner.manager.create(Provider, {
            tenant_id: validTenantId,
            name: cleanName,
            tax_id: cleanRif,
            taxpayer_type: 'EXEMPT',
            zone_code: 'DC',
            is_active: true,
          });
          provider = await queryRunner.manager.save(Provider, provider);
        }

        validSupplierId = provider.id;
      }

      // 2. Foreign Key User Validation for created_by_user_id
      let validUserId: string | undefined = undefined;
      if (isValidUUID(userId)) {
        const userExists = await queryRunner.manager.findOne(User, { where: { id: userId } });
        if (userExists) validUserId = userExists.id;
      }
      if (!validUserId) {
        const tenantUser = await queryRunner.manager.findOne(User, { where: { tenant_id: validTenantId } });
        if (tenantUser) {
          validUserId = tenantUser.id;
        } else {
          const anyUser = await queryRunner.manager.findOne(User, {});
          if (anyUser) validUserId = anyUser.id;
        }
      }

      // 3. Calculate Order Number
      const count = await queryRunner.manager.count(PurchaseOrder, { where: { tenant_id: validTenantId } });
      const formattedNum = String(count + 1).padStart(10, '0');
      const orderNumber = `OC-${formattedNum}`;

      let subtotal = 0;
      let totalTax = 0;

      // 4. Process Items (DB-verifying Product and Warehouse FKs, auto-creating Product if missing)
      const items: PurchaseOrderItem[] = [];
      for (let idx = 0; idx < dto.items.length; idx++) {
        const i = dto.items[idx];
        let targetProductId: string | undefined = undefined;

        if (isValidUUID(i.productId)) {
          const existingProduct = await queryRunner.manager.findOne(Product, {
            where: { id: i.productId, tenant_id: validTenantId },
          });
          if (existingProduct) {
            targetProductId = existingProduct.id;
          }
        }

        if (!targetProductId) {
          const cleanProdName = i.productId ? i.productId.trim() : 'Producto General';
          let existingProduct = await queryRunner.manager.findOne(Product, {
            where: { tenant_id: validTenantId, name: cleanProdName },
          });
          if (!existingProduct) {
            const generatedSku = `PROD-${Date.now().toString().slice(-6)}-${idx + 1}`;
            existingProduct = queryRunner.manager.create(Product, {
              tenant_id: validTenantId,
              sku: generatedSku,
              name: cleanProdName,
              cost_usd: Number(i.unitCostUsd || 0),
              price_usd: Number((i.unitCostUsd * 1.3).toFixed(2)),
              unit_of_measure: 'unidades',
              tax_rate: i.taxRate || 16,
            });
            existingProduct = await queryRunner.manager.save(Product, existingProduct);
          }
          targetProductId = existingProduct.id;
        }

        // DB-verify warehouse_id FK if provided
        let validWarehouseId: string | undefined = undefined;
        if (isValidUUID(i.warehouseId)) {
          const existingWh = await queryRunner.manager.findOne(WarehouseLocation, {
            where: { id: i.warehouseId, tenant_id: validTenantId },
          });
          if (existingWh) {
            validWarehouseId = existingWh.id;
          }
        }

        const grossCost = i.quantityOrdered * i.unitCostUsd;
        const discPct = i.discountPercentage || 0;
        const discAmt = i.discountAmount !== undefined ? i.discountAmount : (grossCost * discPct) / 100;
        const netLineCost = grossCost - discAmt;

        const taxRate = i.taxRate !== undefined ? i.taxRate : 16.00;
        const lineTax = (netLineCost * taxRate) / 100;
        const addTax = i.additionalTaxAmount || 0;

        subtotal += netLineCost;
        totalTax += lineTax + addTax;

        items.push(
          new PurchaseOrderItem({
            item_number: i.itemNumber || idx + 1,
            product_id: targetProductId,
            model: i.model,
            warehouse_id: validWarehouseId,
            quantity_ordered: i.quantityOrdered,
            quantity_received: 0,
            unit_cost_usd: i.unitCostUsd,
            discount_percentage: discPct,
            discount_amount: discAmt,
            tax_type: i.taxType || 'TAXABLE',
            tax_rate: taxRate,
            additional_tax_amount: addTax,
            total_cost_usd: netLineCost,
            line_comment: i.lineComment,
          })
        );
      }

      const globalDiscPct = dto.globalDiscountPercentage || 0;
      const globalDiscAmt = dto.globalDiscountAmount !== undefined ? dto.globalDiscountAmount : (subtotal * globalDiscPct) / 100;

      const globalSurchPct = dto.globalSurchargePercentage || 0;
      const globalSurchAmt = dto.globalSurchargeAmount !== undefined ? dto.globalSurchargeAmount : (subtotal * globalSurchPct) / 100;

      const finalTotal = subtotal - globalDiscAmt + totalTax + globalSurchAmt;

      let validExpectedDate: Date | undefined = undefined;
      if (dto.expectedDate && !isNaN(Date.parse(dto.expectedDate))) {
        validExpectedDate = new Date(dto.expectedDate);
      }

      const order = queryRunner.manager.create(PurchaseOrder, {
        tenant_id: tenantId,
        order_number: orderNumber,
        supplier_id: validSupplierId,
        supplier_name: dto.supplierName.trim(),
        supplier_rif: dto.supplierRif?.trim().toUpperCase(),
        payment_term: dto.paymentTerm || 'CONTADO',
        currency: dto.currency || 'USD',
        exchange_rate: dto.exchangeRate || 1.0000,
        is_national: dto.isNational !== undefined ? dto.isNational : true,
        status: 'SENT',
        expected_date: validExpectedDate,
        notes: dto.notes,
        subtotal_usd: subtotal,
        global_discount_percentage: globalDiscPct,
        global_discount_amount: globalDiscAmt,
        global_surcharge_percentage: globalSurchPct,
        global_surcharge_amount: globalSurchAmt,
        tax_usd: totalTax,
        total_usd: finalTotal,
        created_by_user_id: validUserId,
        created_by_user_name: userName,
      });

      const savedOrder = await queryRunner.manager.save(PurchaseOrder, order);

      const itemsToSave = items.map((item) => {
        item.order_id = savedOrder.id;
        return queryRunner.manager.create(PurchaseOrderItem, item);
      });

      await queryRunner.manager.save(PurchaseOrderItem, itemsToSave);

      savedOrder.items = itemsToSave;

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
