import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../../../domain/entities/product.entity';

export type PriceAdjustmentMode = 'MARGIN' | 'PERCENTAGE_INCREASE' | 'FIXED_PRICE';

export interface BulkUpdatePricesDto {
  productIds?: string[];
  categoryId?: string;
  mode: PriceAdjustmentMode;
  value: number; // e.g. 30 for 30% margin or 10 for 10% increase
}

@Injectable()
export class BulkUpdatePricesUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(
    tenantId: string,
    userName: string,
    dto: BulkUpdatePricesDto,
  ): Promise<{ updatedCount: number; products: Product[] }> {
    let whereClause: any = { tenant_id: tenantId };

    if (dto.productIds && dto.productIds.length > 0) {
      whereClause.id = In(dto.productIds);
    } else if (dto.categoryId) {
      whereClause.category_id = dto.categoryId;
    }

    const products = await this.productRepository.find({ where: whereClause });
    const updatedProducts: Product[] = [];

    for (const product of products) {
      let newPrice = Number(product.price_usd || 0);

      if (dto.mode === 'MARGIN') {
        const cost = Number(product.cost_usd || 0);
        newPrice = cost * (1 + dto.value / 100);
      } else if (dto.mode === 'PERCENTAGE_INCREASE') {
        newPrice = newPrice * (1 + dto.value / 100);
      } else if (dto.mode === 'FIXED_PRICE') {
        newPrice = dto.value;
      }

      newPrice = Math.round(newPrice * 100) / 100; // Round to 2 decimals

      product.price_usd = newPrice;
      product.updated_by_user_name = userName;
      updatedProducts.push(product);
    }

    if (updatedProducts.length > 0) {
      await this.productRepository.save(updatedProducts);
    }

    return {
      updatedCount: updatedProducts.length,
      products: updatedProducts,
    };
  }
}
