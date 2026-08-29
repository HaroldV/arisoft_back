import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateProductDto } from './create-product.dto';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { Product } from '../../../domain/entities/product.entity';
import { Category } from '../../../domain/entities/category.entity';
import { ProductBatch } from '../../../domain/entities/product-batch.entity';
import { WarehouseLocation, LocationType } from '../../../domain/entities/warehouse-location.entity';
import { StockBalance } from '../../../domain/entities/stock-balance.entity';

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
  async execute(tenantId: string, products: CreateProductDto[], user?: { id: string; name?: string }) {
    const results = {
      success: [],
      errors: [],
    };

    // 1. Sanitize input SKUs and check payload for internal duplicates
    const payloadSkus = products.map(p => (p.sku || '').trim());
    
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

            // Resolve Category ID
            let resolvedCategoryId: string | null = null;
            if (productData.categoryId) {
              const cat = await manager.findOne(Category, {
                where: [
                  { id: productData.categoryId, tenant_id: tenantId },
                  { id: productData.categoryId, tenant_id: null }
                ]
              });
              if (cat) {
                resolvedCategoryId = cat.id;
              }
            }

            if (!resolvedCategoryId) {
              const categoryName = (productData.category || 'General').trim();
              let cat = await manager.createQueryBuilder(Category, 'c')
                .where('LOWER(c.name) = LOWER(:name)', { name: categoryName })
                .andWhere('(c.tenant_id = :tenantId OR c.tenant_id IS NULL)', { tenantId })
                .orderBy('(c.tenant_id IS NOT NULL)', 'DESC')
                .getOne();

              if (!cat) {
                cat = await manager.save(Category, new Category({
                  tenant_id: tenantId,
                  name: categoryName,
                  code: null,
                  is_active: true
                }));
              }
              resolvedCategoryId = cat.id;
            }

            // Create Product entity
            const product = await manager.save(Product, new Product({
              tenant_id: tenantId,
              sku: sanitizedSku,
              name: productData.name,
              description: productData.description || sanitizedSku,
              cost_usd: productData.costUsd,
              price_usd: productData.priceUsd,
              tax_rate: productData.taxRate,
              tax_type: productData.taxType || 'TAXABLE',
              is_perishable: productData.isPerishable || false,
              has_batch_control: productData.hasBatchControl || false,
              unit_of_measure: productData.unitOfMeasure || 'unidades',
              category_id: resolvedCategoryId,
              variations: productData.variations || [],
              advanced_fields: productData.advancedFields || {},
              image_url: productData.imageUrl || productData.image_url || null,
              created_by_user_id: user?.id,
              created_by_user_name: user?.name,
            }));

            // Create immutable initial stock movement if initialStock is specified
            const initialQty = Number(productData.initialStock || 0);
            if (initialQty > 0 || productData.locationId) {
              const move = await manager.save(StockMove, new StockMove({
                tenant_id: tenantId,
                product_id: product.id,
                type: StockMoveType.INITIAL_LOAD,
                quantity: initialQty,
                cost_at_time: productData.costUsd || 0,
              }));

              // Resolve or auto-create default warehouse location
              let resolvedLocationId = productData.locationId;
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

              // Resolve batch if batch control or perishable is enabled
              let resolvedBatchId: string | null = null;
              if ((product.has_batch_control || product.is_perishable) && productData.batchNumber) {
                const batchNum = productData.batchNumber.trim().toUpperCase();
                let batch = await manager.findOne(ProductBatch, {
                  where: { tenant_id: tenantId, product_id: product.id, batch_number: batchNum }
                });
                if (!batch) {
                  batch = await manager.save(ProductBatch, new ProductBatch({
                    tenant_id: tenantId,
                    product_id: product.id,
                    batch_number: batchNum,
                    production_date: productData.productionDate || undefined,
                    expiration_date: productData.expirationDate || undefined
                  }));
                }
                resolvedBatchId = batch.id;
              }

              // Upsert StockBalance in WMS
              if (initialQty > 0) {
                let balance = await manager.findOne(StockBalance, {
                  where: {
                    tenant_id: tenantId,
                    location_id: resolvedLocationId,
                    product_id: product.id,
                    batch_id: resolvedBatchId || undefined,
                  }
                });
                if (balance) {
                  balance.quantity = Number(balance.quantity) + initialQty;
                  await manager.save(StockBalance, balance);
                } else {
                  await manager.save(StockBalance, new StockBalance({
                    tenant_id: tenantId,
                    location_id: resolvedLocationId,
                    product_id: product.id,
                    batch_id: resolvedBatchId || null,
                    quantity: initialQty
                  }));
                }
              }
            } else {
              // Ensure default warehouse exists for the tenant even if initial stock is 0
              let defaultLoc = await manager.findOne(WarehouseLocation, {
                where: { tenant_id: tenantId, type: LocationType.WAREHOUSE }
              });
              if (!defaultLoc) {
                await manager.save(WarehouseLocation, new WarehouseLocation({
                  tenant_id: tenantId,
                  name: 'Almacén Principal',
                  type: LocationType.WAREHOUSE,
                  capacity_limit: 0
                }));
              }
            }

            results.success.push({
              line: index + 1,
              sku: sanitizedSku,
              productId: product.id,
            });
          } catch (err: any) {
            results.errors.push({
              line: index + 1,
              sku: productData.sku || 'N/A',
              reason: err.message,
            });
          }
        }
      });
    } catch (txError: any) {
      throw txError;
    }

    return results;
  }
}
