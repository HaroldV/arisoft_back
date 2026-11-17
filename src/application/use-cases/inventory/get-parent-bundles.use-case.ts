import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { ProductComponentRepository } from '../../../infrastructure/persistence/typeorm/repositories/product-component.repository';

export interface ParentBundleInfo {
  bundle_id: string;
  bundle_name: string;
  bundle_sku: string;
  bundle_price_usd: number;
  units_per_bundle: number;
  available_bundles: number;
}

@Injectable()
export class GetParentBundlesUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly componentRepo: ProductComponentRepository,
  ) {}

  async execute(tenantId: string, childProductId: string, warehouseId?: string): Promise<ParentBundleInfo[]> {
    const child = await this.productRepo.findById(childProductId, tenantId);
    if (!child) {
      throw new NotFoundException(`Producto con ID ${childProductId} no encontrado.`);
    }

    // Buscar todos los componentes donde este producto sea hijo
    const bundleRelations = await this.componentRepo.findParentBundlesForChild(childProductId, tenantId);
    if (!bundleRelations || bundleRelations.length === 0) {
      return [];
    }

    const result: ParentBundleInfo[] = [];

    for (const rel of bundleRelations) {
      const parent = rel.parent_product || (await this.productRepo.findById(rel.parent_product_id, tenantId));
      if (!parent || parent.deleted_at) continue;

      let availableStock = 0;
      if (warehouseId) {
        availableStock = await this.productRepo.getStockForWarehouse(parent.id, warehouseId, tenantId);
      }

      result.push({
        bundle_id: parent.id,
        bundle_name: parent.name,
        bundle_sku: parent.sku,
        bundle_price_usd: Number(parent.price_usd || 0),
        units_per_bundle: Number(rel.quantity),
        available_bundles: availableStock,
      });
    }

    return result;
  }
}
