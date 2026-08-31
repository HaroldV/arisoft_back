import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseReceptionNote, PurchaseReceptionItem, PurchaseReceptionItemSerial } from '../../../domain/entities/purchase-reception.entity';
import { PurchaseOrder, PurchaseOrderItem } from '../../../domain/entities/purchase-order.entity';
import { Product } from '../../../domain/entities/product.entity';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { ProductCostHistory } from '../../../domain/entities/product-cost-history.entity';
import { AccountPayable } from '../../../domain/entities/account-payable.entity';
import { AccountStatus } from '../../../domain/entities/account-receivable.entity';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { WarehouseLocation } from '../../../domain/entities/warehouse-location.entity';

export interface ReceptionItemInput {
  itemNumber?: number;
  productId: string;
  model?: string;
  warehouseId?: string;
  quantityReceived: number;
  quantityPending?: number;
  quantityReturned?: number;
  unitCostUsd: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  additionalTaxAmount?: number;
  lineComment?: string;
  batchNumber?: string;
  expirationDate?: string;
  serials?: string[];
}

export interface CreatePurchaseReceptionDto {
  orderId?: string;
  supplierId?: string;
  supplierName?: string;
  supplierRif?: string;
  ndrNumber?: string;
  warehouseName?: string;
  paymentTerm?: string;
  currency?: string;
  exchangeRate?: number;
  isNational?: boolean;
  notes?: string;
  globalDiscountAmount?: number;
  globalSurchargeAmount?: number;
  items: ReceptionItemInput[];
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const isValidUUID = (id?: string) => typeof id === 'string' && UUID_REGEX.test(id);

@Injectable()
export class CreatePurchaseReceptionUseCase {
  constructor(
    @InjectRepository(PurchaseReceptionNote)
    private readonly receptionRepository: Repository<PurchaseReceptionNote>,
    @InjectRepository(PurchaseOrder)
    private readonly orderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly orderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(StockMove)
    private readonly stockMoveRepository: Repository<StockMove>,
    @InjectRepository(ProductCostHistory)
    private readonly costHistoryRepository: Repository<ProductCostHistory>,
    @InjectRepository(PurchaseReceptionItemSerial)
    private readonly serialRepository: Repository<PurchaseReceptionItemSerial>,
    @InjectRepository(AccountPayable)
    private readonly payableRepository: Repository<AccountPayable>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WarehouseLocation)
    private readonly warehouseRepository: Repository<WarehouseLocation>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    tenantId: string,
    userId: string,
    userName: string,
    dto: CreatePurchaseReceptionDto,
  ): Promise<PurchaseReceptionNote> {
    if (!dto.orderId) {
      throw new BadRequestException('Es obligatorio seleccionar una Orden de Compra previa para registrar la recepción.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Validate and resolve valid Tenant ID
      let validTenantId = isValidUUID(tenantId) ? tenantId : undefined;
      if (!validTenantId) {
        const firstTenant = await queryRunner.manager.findOne(Tenant, { where: {} });
        if (firstTenant) {
          validTenantId = firstTenant.id;
        }
      }

      let order = await queryRunner.manager.findOne(PurchaseOrder, {
        where: { id: dto.orderId, tenant_id: validTenantId },
        relations: ['items'],
      });

      if (!order) {
        order = await queryRunner.manager.findOne(PurchaseOrder, {
          where: { id: dto.orderId },
          relations: ['items'],
        });
      }

      if (!order) {
        throw new NotFoundException(`La Orden de Compra con ID ${dto.orderId} no existe`);
      }

      if (order.tenant_id && !validTenantId) {
        validTenantId = order.tenant_id;
      }

      // 1. Validate and resolve valid User ID for created_by_user_id FK (Guaranteed NOT NULL)
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
          const anyUser = await queryRunner.manager.findOne(User, { where: {} });
          if (anyUser) {
            validUserId = anyUser.id;
          } else {
            // Create system fallback user for tenant if none exists
            const fallbackUser = queryRunner.manager.create(User, {
              tenant_id: validTenantId,
              full_name: userName || 'Administrador Sistema',
              email: `admin_${Date.now()}@arivsoft.com`,
              password_hash: 'system_generated_hash',
              role: UserRole.OWNER,
              allowed_modules: ['ALL'],
              allowed_permissions: ['ALL'],
              is_active: true,
            });
            const savedUser = await queryRunner.manager.save(User, fallbackUser);
            validUserId = savedUser.id;
          }
        }
      }

      const count = await queryRunner.manager.count(PurchaseReceptionNote, { where: { tenant_id: validTenantId } });
      const formattedNum = String(count + 1).padStart(10, '0');
      const receptionNumber = `REC-${formattedNum}`;

      const rawSupplierId = order.supplier_id || dto.supplierId;
      const validSupplierId = isValidUUID(rawSupplierId) ? rawSupplierId : undefined;

      const reception = queryRunner.manager.create(PurchaseReceptionNote, {
        tenant_id: validTenantId,
        reception_number: receptionNumber,
        order_id: order.id,
        supplier_id: validSupplierId,
        supplier_name: order.supplier_name || dto.supplierName || 'Proveedor General',
        supplier_rif: order.supplier_rif || dto.supplierRif,
        ndr_number: dto.ndrNumber,
        warehouse_name: dto.warehouseName || 'Almacén Principal',
        payment_term: order.payment_term || dto.paymentTerm || 'CONTADO',
        currency: order.currency || dto.currency || 'USD',
        exchange_rate: order.exchange_rate || dto.exchangeRate || 1.0000,
        is_national: order.is_national !== undefined ? order.is_national : true,
        status: 'RECEIVED',
        notes: dto.notes,
        global_discount_amount: dto.globalDiscountAmount || 0,
        global_surcharge_amount: dto.globalSurchargeAmount || 0,
        created_by_user_id: validUserId,
        created_by_user_name: userName,
      });

      const savedReception = await queryRunner.manager.save(PurchaseReceptionNote, reception);
      const receptionItems: PurchaseReceptionItem[] = [];

      for (const [idx, itemInput] of dto.items.entries()) {
        let product: Product | null = null;
        if (isValidUUID(itemInput.productId)) {
          product = await queryRunner.manager.findOne(Product, {
            where: { id: itemInput.productId, tenant_id: validTenantId },
          });
          if (!product) {
            product = await queryRunner.manager.findOne(Product, {
              where: { id: itemInput.productId },
            });
          }
        }

        if (!product) {
          const fallbackName = (itemInput.lineComment || itemInput.model || itemInput.productId || `Producto ${idx + 1}`).trim();
          product = await queryRunner.manager.findOne(Product, {
            where: { tenant_id: validTenantId, name: fallbackName },
          });

          if (!product) {
            const generatedSku = `PROD-REC-${Date.now().toString().slice(-6)}-${idx + 1}`;
            product = queryRunner.manager.create(Product, {
              tenant_id: validTenantId,
              sku: generatedSku,
              name: fallbackName,
              cost_usd: Number(itemInput.unitCostUsd || 0),
              price_usd: Number((itemInput.unitCostUsd * 1.3).toFixed(2)),
              unit_of_measure: 'unidades',
              current_stock: 0,
              tax_rate: itemInput.taxRate || 16,
            });
            product = await queryRunner.manager.save(Product, product);
          }
        }

        const currentStock = Number(product.current_stock || 0);
        const currentCost = Number(product.cost_usd || product.costUsd || 0);

        // Weighted Average Costing (CPP / WACC) calculation
        const receivedQty = Number(itemInput.quantityReceived);
        const newUnitCost = Number(itemInput.unitCostUsd);

        let weightedCost = newUnitCost;
        if (currentStock + receivedQty > 0) {
          weightedCost = ((currentStock * currentCost) + (receivedQty * newUnitCost)) / (currentStock + receivedQty);
        }

        weightedCost = Number(weightedCost.toFixed(4));

        if (currentCost !== weightedCost) {
          await queryRunner.manager.save(ProductCostHistory, new ProductCostHistory({
            tenant_id: validTenantId,
            product_id: product.id,
            old_cost_usd: currentCost,
            new_cost_usd: weightedCost,
            source_type: 'PURCHASE_RECEPTION',
            source_id: savedReception.id,
            created_by_user_name: userName,
          }));
        }

        product.cost_usd = weightedCost;
        product.current_stock = currentStock + receivedQty;
        await queryRunner.manager.save(Product, product);

        const grossCost = receivedQty * newUnitCost;
        const discPct = itemInput.discountPercentage || 0;
        const discAmt = itemInput.discountAmount !== undefined ? itemInput.discountAmount : (grossCost * discPct) / 100;
        const netLine = grossCost - discAmt;
        const taxRate = itemInput.taxRate !== undefined ? itemInput.taxRate : 16.00;
        const taxAmt = (netLine * taxRate) / 100;

        let validWarehouseId: string | undefined = undefined;
        if (isValidUUID(itemInput.warehouseId)) {
          const existingWh = await queryRunner.manager.findOne(WarehouseLocation, {
            where: { id: itemInput.warehouseId, tenant_id: validTenantId },
          });
          if (existingWh) {
            validWarehouseId = existingWh.id;
          }
        }

        await queryRunner.manager.save(StockMove, new StockMove({
          tenant_id: validTenantId,
          product_id: product.id,
          quantity: receivedQty,
          type: StockMoveType.PURCHASE,
          cost_at_time: newUnitCost,
          source_type: 'PURCHASE_RECEPTION',
          source_id: savedReception.id,
          justification: `Recepción ${receptionNumber} - NDR: ${dto.ndrNumber || 'N/A'}`,
          warehouse_location_id: validWarehouseId,
          created_by_user_id: validUserId,
        }));

        const receptionItem = new PurchaseReceptionItem({
          reception_id: savedReception.id,
          item_number: itemInput.itemNumber || idx + 1,
          product_id: product.id,
          model: itemInput.model,
          warehouse_id: validWarehouseId,
          quantity_received: receivedQty,
          quantity_pending: itemInput.quantityPending || 0,
          quantity_returned: itemInput.quantityReturned || 0,
          unit_cost_usd: newUnitCost,
          discount_percentage: discPct,
          discount_amount: discAmt,
          tax_rate: taxRate,
          tax_amount: taxAmt,
          net_total: netLine,
          additional_tax_amount: itemInput.additionalTaxAmount || 0,
          line_comment: itemInput.lineComment,
          batch_number: itemInput.batchNumber,
          expiration_date: itemInput.expirationDate ? new Date(itemInput.expirationDate) : undefined,
        });

        const savedItem = await queryRunner.manager.save(PurchaseReceptionItem, receptionItem);

        if (itemInput.serials && itemInput.serials.length > 0) {
          for (const serialStr of itemInput.serials) {
            if (serialStr.trim()) {
              await queryRunner.manager.save(PurchaseReceptionItemSerial, new PurchaseReceptionItemSerial({
                reception_item_id: savedItem.id,
                product_id: product.id,
                serial_number: serialStr.trim(),
              }));
            }
          }
        }

        receptionItems.push(savedItem);
      }

      // Update Purchase Order Status if orderId was linked
      if (dto.orderId) {
        const orderToUpdate = await queryRunner.manager.findOne(PurchaseOrder, {
          where: { id: dto.orderId, tenant_id: validTenantId },
          relations: ['items'],
        });

        if (orderToUpdate) {
          for (const ordItem of orderToUpdate.items) {
            const matchingInput = dto.items.find(i => i.productId === ordItem.product_id);
            if (matchingInput) {
              const receivedQty = Number(matchingInput.quantityReceived || 0);
              ordItem.quantity_received = Number(ordItem.quantity_received || 0) + receivedQty;
              await queryRunner.manager.save(PurchaseOrderItem, ordItem);
            }
          }

          const allCompleted = orderToUpdate.items.every(
            oi => Number(oi.quantity_received || 0) >= Number(oi.quantity_ordered || 0)
          );
          orderToUpdate.status = allCompleted ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
          await queryRunner.manager.save(PurchaseOrder, orderToUpdate);
        }
      }

      // Calculate total reception amount
      let totalReceptionUsd = receptionItems.reduce(
        (acc, item) => acc + Number(item.net_total || 0) + Number(item.tax_amount || 0) + Number(item.additional_tax_amount || 0),
        0,
      );
      totalReceptionUsd = totalReceptionUsd - (dto.globalDiscountAmount || 0) + (dto.globalSurchargeAmount || 0);
      totalReceptionUsd = Number(totalReceptionUsd.toFixed(2));

      // Register account payable (CxP) automatically in database (Always PENDING until formal invoice payment)
      await queryRunner.manager.save(
        AccountPayable,
        new AccountPayable({
          tenant_id: validTenantId,
          provider_id: validSupplierId,
          provider_name: reception.supplier_name,
          reference_document_id: savedReception.id,
          reference_document_number: receptionNumber,
          reference_date: new Date().toISOString().split('T')[0],
          notes: `Recepción ${receptionNumber} - Guía NDR: ${dto.ndrNumber || 'N/A'} - Condición: ${reception.payment_term || 'CONTADO'}`,
          previous_balance: 0,
          period_amount: totalReceptionUsd,
          total_paid: 0,
          balance_due: totalReceptionUsd,
          status: AccountStatus.PENDING,
          created_by_user_id: validUserId,
          created_by_user_name: userName,
        })
      );

      savedReception.items = receptionItems;

      await queryRunner.commitTransaction();
      return savedReception;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
