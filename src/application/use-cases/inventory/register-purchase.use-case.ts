import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PurchaseInvoice } from '../../../domain/entities/purchase-invoice.entity';
import { PurchaseItem } from '../../../domain/entities/purchase-item.entity';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { Product } from '../../../domain/entities/product.entity';
import { PurchaseInvoiceRepository } from '../../../infrastructure/persistence/postgresql/repositories/purchase-invoice.repository';
import { ProductRepository } from '../../../infrastructure/persistence/postgresql/repositories/product.repository';
import { RegisterPurchaseDto } from './register-purchase.dto';

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
      // Calculate total amount
      let totalAmountUsd = 0;
      for (const item of dto.items) {
        totalAmountUsd += item.quantity * item.unitCostUsd;
      }

      // Save purchase invoice
      const invoice = await manager.save(PurchaseInvoice, new PurchaseInvoice({
        tenant_id: tenantId,
        invoice_number: dto.invoiceNumber.trim(),
        supplier_name: dto.supplierName.trim(),
        total_amount_usd: totalAmountUsd,
        proof_file_path: dto.proofFilePath,
        created_by_user_id: userId,
      }));

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
      }

      return {
        message: 'Purchase registered successfully',
        invoiceId: invoice.id,
        totalAmountUsd,
      };
    });
  }
}
