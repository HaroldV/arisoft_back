import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateProductDto } from './create-product.dto';
import { ProductRepository } from '../../../infrastructure/persistence/postgresql/repositories/product.repository';
import { StockMoveRepository } from '../../../infrastructure/persistence/postgresql/repositories/stock-move.repository';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { Product } from '../../../domain/entities/product.entity';

@Injectable()
export class BulkUploadProductsUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly stockMoveRepo: StockMoveRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * execute
   * Purpose: Handle CSV data, validate SKUs, and perform atomic transaction insert.
   */
  async execute(tenantId: string, products: CreateProductDto[]) {
    const results = {
      success: [],
      errors: [],
    };

    // 1. Sanitize input SKUs and check payload for internal duplicates
    const payloadSkus = products.map(p => (p.sku || '').trim());
    const uniquePayloadSkus = new Set(payloadSkus);
    
    // 2. Fetch existing products matching these SKUs to prevent OOM
    const existingProducts = await this.productRepo.findBySkus(payloadSkus);
    const existingSkus = new Set(existingProducts.map(p => p.sku));

    // 3. Process inside an atomic transaction
    try {
      await this.dataSource.transaction(async (manager) => {
        for (const [index, productData] of products.entries()) {
          try {
            const sanitizedSku = (productData.sku || '').trim();

            if (!sanitizedSku) {
              throw new Error('SKU cannot be empty');
            }

            if (existingSkus.has(sanitizedSku)) {
              throw new Error(`SKU already exists: ${sanitizedSku}`);
            }

            // Create Product entity (ignore current_stock since it's transient)
            const product = await manager.save(Product, new Product({
              tenant_id: tenantId,
              sku: sanitizedSku,
              name: productData.name,
              description: productData.description || sanitizedSku,
              cost_usd: productData.costUsd,
              price_usd: productData.priceUsd,
              tax_rate: productData.taxRate,
            }));

            // Create immutable initial stock movement
            const move = await manager.save(StockMove, new StockMove({
              tenant_id: tenantId,
              product_id: product.id,
              type: StockMoveType.INITIAL_LOAD,
              quantity: productData.initialStock,
              cost_at_time: productData.costUsd,
            }));

            results.success.push({ sku: sanitizedSku, productId: product.id, moveId: move.id });
            existingSkus.add(sanitizedSku);
          } catch (error) {
            results.errors.push({ line: index + 1, sku: productData.sku, error: error.message });
          }
        }

        // If any record failed, throw to rollback the entire transaction
        if (results.errors.length > 0) {
          throw new Error('ROLLBACK_ON_ERRORS');
        }
      });
    } catch (error) {
      if (error.message !== 'ROLLBACK_ON_ERRORS') {
        throw error;
      }
    }

    return results;
  }
}
