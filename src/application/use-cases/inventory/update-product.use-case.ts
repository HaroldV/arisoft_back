import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductRepository } from '../../../infrastructure/persistence/postgresql/repositories/product.repository';
import { StockMoveRepository } from '../../../infrastructure/persistence/postgresql/repositories/stock-move.repository';
import { UpdateProductDto } from './update-product.dto';
import { Product } from '../../../domain/entities/product.entity';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly stockMoveRepo: StockMoveRepository,
  ) {}

  async execute(productId: string, dto: UpdateProductDto): Promise<Product> {
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
    if (dto.costUsd !== undefined) product.cost_usd = dto.costUsd;
    if (dto.priceUsd !== undefined) product.price_usd = dto.priceUsd;
    if (dto.taxRate !== undefined) product.tax_rate = dto.taxRate;

    // 5. Save changes
    return this.productRepo.save(product);
  }
}
