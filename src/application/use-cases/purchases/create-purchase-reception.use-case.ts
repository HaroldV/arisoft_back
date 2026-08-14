import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseReceptionNote, PurchaseReceptionItem, PurchaseReceptionItemSerial } from '../../../domain/entities/purchase-reception.entity';
import { PurchaseOrder, PurchaseOrderItem } from '../../../domain/entities/purchase-order.entity';
import { Product } from '../../../domain/entities/product.entity';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { ProductCostHistory } from '../../../domain/entities/product-cost-history.entity';
import { AccountPayable } from '../../../domain/entities/account-payable.entity';
import { AccountStatus } from '../../../domain/entities/account-receivable.entity';

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

    let order = await this.orderRepository.findOne({
      where: { id: dto.orderId, tenant_id: tenantId },
      relations: ['items'],
    });

    if (!order) {
      order = await this.orderRepository.findOne({
        where: { id: dto.orderId },
        relations: ['items'],
      });
    }

    if (!order) {
      throw new NotFoundException(`La Orden de Compra con ID ${dto.orderId} no existe`);
    }

    const count = await this.receptionRepository.count({ where: { tenant_id: tenantId } });
    const formattedNum = String(count + 1).padStart(10, '0');
    const receptionNumber = `REC-${formattedNum}`;

    const rawSupplierId = order.supplier_id || dto.supplierId;
    const validSupplierId = isValidUUID(rawSupplierId) ? rawSupplierId : undefined;
    const validUserId = isValidUUID(userId) ? userId : undefined;

    const reception = this.receptionRepository.create({
      tenant_id: tenantId,
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

    const savedReception = await this.receptionRepository.save(reception);
    const receptionItems: PurchaseReceptionItem[] = [];

    for (const [idx, itemInput] of dto.items.entries()) {
      let product: Product | null = null;
      if (isValidUUID(itemInput.productId)) {
        product = await this.productRepository.findOne({
          where: { id: itemInput.productId, tenant_id: tenantId },
        });
        if (!product) {
          product = await this.productRepository.findOne({
            where: { id: itemInput.productId },
          });
        }
      }

      if (!product) {
        const fallbackName = (itemInput.lineComment || itemInput.model || itemInput.productId || `Producto ${idx + 1}`).trim();
        product = await this.productRepository.findOne({
          where: { tenant_id: tenantId, name: fallbackName },
        });

        if (!product) {
          const generatedSku = `PROD-REC-${Date.now().toString().slice(-6)}-${idx + 1}`;
          product = this.productRepository.create({
            tenant_id: tenantId,
            sku: generatedSku,
            name: fallbackName,
            cost_usd: Number(itemInput.unitCostUsd || 0),
            price_usd: Number((itemInput.unitCostUsd * 1.3).toFixed(2)),
            unit_of_measure: 'unidades',
            current_stock: 0,
            tax_rate: itemInput.taxRate || 16,
          });
          product = await this.productRepository.save(product);
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
        await this.costHistoryRepository.save(new ProductCostHistory({
          tenant_id: tenantId,
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
      await this.productRepository.save(product);

      const grossCost = receivedQty * newUnitCost;
      const discPct = itemInput.discountPercentage || 0;
      const discAmt = itemInput.discountAmount !== undefined ? itemInput.discountAmount : (grossCost * discPct) / 100;
      const netLine = grossCost - discAmt;
      const taxRate = itemInput.taxRate !== undefined ? itemInput.taxRate : 16.00;
      const taxAmt = (netLine * taxRate) / 100;

      const validWarehouseId = isValidUUID(itemInput.warehouseId) ? itemInput.warehouseId : undefined;

      await this.stockMoveRepository.save(new StockMove({
        tenant_id: tenantId,
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

      const savedItem = await this.receptionRepository.manager.save(PurchaseReceptionItem, receptionItem);

      if (itemInput.serials && itemInput.serials.length > 0) {
        for (const serialStr of itemInput.serials) {
          if (serialStr.trim()) {
            await this.serialRepository.save(new PurchaseReceptionItemSerial({
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
      const order = await this.orderRepository.findOne({
        where: { id: dto.orderId, tenant_id: tenantId },
        relations: ['items'],
      });

      if (order) {
        for (const ordItem of order.items) {
          const matchingInput = dto.items.find(i => i.productId === ordItem.product_id);
          if (matchingInput) {
            const receivedQty = Number(matchingInput.quantityReceived || 0);
            ordItem.quantity_received = Number(ordItem.quantity_received || 0) + receivedQty;
            await this.orderItemRepository.save(ordItem);
          }
        }

        const allCompleted = order.items.every(
          oi => Number(oi.quantity_received || 0) >= Number(oi.quantity_ordered || 0)
        );
        order.status = allCompleted ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
        await this.orderRepository.save(order);
      }
    }

    // Calculate total reception amount
    let totalReceptionUsd = receptionItems.reduce(
      (acc, item) => acc + Number(item.net_total || 0) + Number(item.tax_amount || 0) + Number(item.additional_tax_amount || 0),
      0,
    );
    totalReceptionUsd = totalReceptionUsd - (dto.globalDiscountAmount || 0) + (dto.globalSurchargeAmount || 0);
    totalReceptionUsd = Number(totalReceptionUsd.toFixed(2));

    const paymentTermStr = (reception.payment_term || 'CONTADO').toUpperCase();
    const isCredit = paymentTermStr.includes('CRED') || paymentTermStr.includes('DIAS') || paymentTermStr.includes('DÍAS');

    // Register account payable (CxP) automatically in database (Always PENDING until formal invoice payment)
    await this.payableRepository.save(
      new AccountPayable({
        tenant_id: tenantId,
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
    return savedReception;
  }
}
