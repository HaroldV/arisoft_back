import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { CategoryRepository } from '../../../infrastructure/persistence/typeorm/repositories/category.repository';
import { UpdateProductDto } from './update-product.dto';
import { Product } from '../../../domain/entities/product.entity';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly stockMoveRepo: StockMoveRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  async execute(productId: string, dto: UpdateProductDto, user?: { id: string; name?: string }): Promise<Product> {
    // 1. Fetch product
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const desiresSkuChange = dto.sku !== undefined && dto.sku.trim() !== product.sku;
    const desiresNameChange = dto.name !== undefined && dto.name.trim() !== product.name;

    // 2. If attempting to change SKU or Name, verify sales history
    if (desiresSkuChange || desiresNameChange) {
      const hasSales = await this.stockMoveRepo.hasSales(productId);
      if (hasSales) {
        throw new ConflictException(
          'No se puede modificar el SKU o el nombre de un producto con historial de ventas',
        );
      }
    }

    // 3. Prevent duplicate SKU collision if changing SKU
    if (desiresSkuChange) {
      const trimmedSku = dto.sku!.trim();
      const existing = await this.productRepo.findBySkus([trimmedSku]);
      if (existing.length > 0 && existing[0].id !== productId) {
        throw new ConflictException(`Product with SKU ${trimmedSku} already exists`);
      }
      product.sku = trimmedSku;
    }

    // 4. Map updates
    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.imageUrl !== undefined || dto.image_url !== undefined) {
      product.image_url = dto.imageUrl || dto.image_url || undefined;
    }
    if (dto.costUsd !== undefined || dto.cost_usd !== undefined) {
      product.cost_usd = dto.costUsd ?? dto.cost_usd;
    }
    if (dto.priceUsd !== undefined || dto.price_usd !== undefined) {
      product.price_usd = dto.priceUsd ?? dto.price_usd;
    }
    if (dto.taxRate !== undefined || dto.tax_rate !== undefined) {
      product.tax_rate = dto.taxRate ?? dto.tax_rate;
    }
    if (dto.unitOfMeasure !== undefined || dto.unit_of_measure !== undefined) {
      product.unit_of_measure = dto.unitOfMeasure ?? dto.unit_of_measure;
    }
    if (dto.categoryId !== undefined || dto.category_id !== undefined) {
      product.category_id = dto.categoryId || dto.category_id || null;
    } else if (dto.category !== undefined) {
      const cat = await this.categoryRepo.findOrCreateByName(dto.category);
      product.category_id = cat.id;
    }
    if (dto.variations !== undefined) product.variations = dto.variations;
    if (dto.advancedFields !== undefined || dto.advanced_fields !== undefined) {
      product.advanced_fields = dto.advancedFields || dto.advanced_fields;
    }

    if (user) {
      product.updated_by_user_id = user.id;
      product.updated_by_user_name = user.name;
    }

    // 5. Save changes
    return this.productRepo.save(product);
  }
}
