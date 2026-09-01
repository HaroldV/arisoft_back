import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PurchaseInvoice } from '../../../domain/entities/purchase-invoice.entity';
import { PurchaseItem } from '../../../domain/entities/purchase-item.entity';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { Product } from '../../../domain/entities/product.entity';
import { PurchaseInvoiceRepository } from '../../../infrastructure/persistence/typeorm/repositories/purchase-invoice.repository';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { RegisterPurchaseDto } from './register-purchase.dto';
import { AccountPayable } from '../../../domain/entities/account-payable.entity';
import { AccountStatus } from '../../../domain/entities/account-receivable.entity';
import { WarehouseLocation, LocationType } from '../../../domain/entities/warehouse-location.entity';
import { ProductBatch } from '../../../domain/entities/product-batch.entity';
import { StockBalance } from '../../../domain/entities/stock-balance.entity';

@Injectable()
export class RegisterPurchaseUseCase {
  constructor(
    private readonly purchaseInvoiceRepo: PurchaseInvoiceRepository,
    private readonly productRepo: ProductRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(tenantId: string, userId: string, dto: RegisterPurchaseDto) {
    // 1. Check duplicate invoice for supplier
    const existingInvoice = await this.purchaseInvoiceRepo.findByInvoiceNumber(
      dto.invoiceNumber.trim(),
      dto.supplierName.trim(),
    );
    if (existingInvoice) {
      throw new ConflictException(
        `Invoice ${dto.invoiceNumber} from supplier ${dto.supplierName} is already registered`,
      );
    }

    // 2. Validate all products exist under the tenant
    const productIds = dto.items.map(i => i.productId);
    const uniqueProductIds = Array.from(new Set(productIds));
    const products = await this.productRepo.findByIds(uniqueProductIds);

    if (products.length !== uniqueProductIds.length) {
      const foundIds = new Set(products.map(p => p.id));
      const missingIds = uniqueProductIds.filter(id => !foundIds.has(id));
      throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
    }

    // 3. Process transactional inserts/updates
    return this.dataSource.transaction(async (manager) => {
      // Calculate total amount (respecting discount and surcharge if specified)
      let subtotalAmountUsd = 0;
      for (const item of dto.items) {
        subtotalAmountUsd += item.quantity * item.unitCostUsd;
      }

      const discountPercentage = dto.discountPercentage || 0;
      const discountAmountUsd = Number(((subtotalAmountUsd * discountPercentage) / 100).toFixed(2));
      const surchargePercentage = dto.globalSurchargePercentage || 0;
      const surchargeAmountUsd = Number(((subtotalAmountUsd * surchargePercentage) / 100).toFixed(2));
      const totalAmountUsd = Number((subtotalAmountUsd - discountAmountUsd + surchargeAmountUsd).toFixed(2));

      // Save purchase invoice
      const invoice = await manager.save(PurchaseInvoice, new PurchaseInvoice({
        tenant_id: tenantId,
        invoice_number: dto.invoiceNumber.trim(),
        supplier_name: dto.supplierName.trim(),
        total_amount_usd: totalAmountUsd,
        proof_file_path: dto.proofFilePath,
        created_by_user_id: userId,
        provider_id: dto.providerId || null,
        discount_percentage: discountPercentage,
        discount_amount_usd: discountAmountUsd,
      }));

      // Determine credit condition & days
      const isCreditTerm = dto.paymentTerm && dto.paymentTerm.startsWith('CREDITO');
      const isCredit = Boolean(dto.isCredit || isCreditTerm || (dto.paymentTermsDays && dto.paymentTermsDays > 0));
      let creditDays = dto.paymentTermsDays || 0;
      if (isCreditTerm && !creditDays) {
        const parts = dto.paymentTerm.split('_');
        creditDays = parts[1] ? parseInt(parts[1], 10) : 30;
      }
      if (isCredit && !creditDays) {
        creditDays = 30;
      }

      // If purchase is on credit, register in Cuentas por Pagar (AccountPayable)
      if (isCredit) {
        const refDate = dto.issueDate || new Date().toISOString().split('T')[0];
        await manager.save(AccountPayable, new AccountPayable({
          tenant_id: tenantId,
          provider_id: dto.providerId || undefined,
          provider_name: dto.supplierName.trim(),
          reference_document_id: invoice.id,
          reference_document_number: dto.invoiceNumber.trim(),
          reference_date: refDate,
          supplier_invoice_number: dto.invoiceNumber.trim(),
          voucher_attachment_url: dto.proofFilePath || undefined,
          notes: dto.notes 
            ? `${dto.notes} [Compra a Crédito (${creditDays} días) - Factura #${dto.invoiceNumber.trim()}]`
            : `Compra a Crédito (${creditDays} días de plazo) - Factura #${dto.invoiceNumber.trim()}`,
          previous_balance: 0,
          period_amount: totalAmountUsd,
          total_paid: 0,
          balance_due: totalAmountUsd,
          status: AccountStatus.PENDING,
          created_by_user_id: userId,
        }));
      }

      // Process lines
      for (const item of dto.items) {
        // Save purchase item line
        await manager.save(PurchaseItem, new PurchaseItem({
          purchase_id: invoice.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_cost_usd: item.unitCostUsd,
        }));

        // Insert double-entry positive stock move
        await manager.save(StockMove, new StockMove({
          tenant_id: tenantId,
          product_id: item.productId,
          type: StockMoveType.PURCHASE,
          quantity: item.quantity,
          cost_at_time: item.unitCostUsd,
          source_type: 'PURCHASE_INVOICE',
          source_id: invoice.id,
          created_by_user_id: userId,
        }));

        // Update product cost in catalog
        await manager.update(Product, { id: item.productId, tenant_id: tenantId }, {
          cost_usd: item.unitCostUsd,
        });

        // 4. Update WMS StockBalances & Batches
        const product = products.find(p => p.id === item.productId)!;

        // 4.1 Resolve locationId (Dock/Transit fallback if not provided or empty)
        let resolvedLocationId = item.locationId;
        if (!resolvedLocationId) {
          let defaultLoc = await manager.findOne(WarehouseLocation, {
            where: { tenant_id: tenantId, type: LocationType.WAREHOUSE }
          });
          if (!defaultLoc) {
            defaultLoc = await manager.save(WarehouseLocation, new WarehouseLocation({
              tenant_id: tenantId,
              name: 'Almacén Principal',
              type: LocationType.WAREHOUSE,
              capacity_limit: 0
            }));
          }
          resolvedLocationId = defaultLoc.id;
        }

        // 4.2 Resolve batchId if product requires batch control or is perishable
        let resolvedBatchId: string | null = null;
        if (product.has_batch_control || product.is_perishable) {
          const batchNum = (item.batchNumber || `LT-${new Date().toISOString().substring(0, 7)}`).trim().toUpperCase();
          let batch = await manager.findOne(ProductBatch, {
            where: {
              tenant_id: tenantId,
              product_id: product.id,
              batch_number: batchNum
            }
          });
          if (!batch) {
            batch = await manager.save(ProductBatch, new ProductBatch({
              tenant_id: tenantId,
              product_id: product.id,
              batch_number: batchNum,
              production_date: item.productionDate || undefined,
              expiration_date: item.expirationDate || undefined
            }));
          }
          resolvedBatchId = batch.id;
        }

        // 4.3 Upsert StockBalance
        let balance = await manager.findOne(StockBalance, {
          where: {
            tenant_id: tenantId,
            location_id: resolvedLocationId,
            product_id: product.id,
            batch_id: resolvedBatchId || undefined,
          }
        });

        if (balance) {
          balance.quantity = Number(balance.quantity) + Number(item.quantity);
          await manager.save(StockBalance, balance);
        } else {
          await manager.save(StockBalance, new StockBalance({
            tenant_id: tenantId,
            location_id: resolvedLocationId,
            product_id: product.id,
            batch_id: resolvedBatchId || null,
            quantity: Number(item.quantity)
          }));
        }
      }

      return {
        message: 'Purchase registered successfully',
        invoiceId: invoice.id,
        totalAmountUsd,
      };
    });
  }
}
