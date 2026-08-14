import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';

@Injectable()
export class DeleteProductUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly stockMoveRepo: StockMoveRepository,
  ) {}

  async execute(productId: string): Promise<void> {
    // 1. Fetch product
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // 2. Verify sales history
    const hasSales = await this.stockMoveRepo.hasSales(productId);
    if (hasSales) {
      throw new ConflictException(
        'No se puede eliminar un producto con historial de ventas',
      );
    }

    // 3. Execute soft delete
    await this.productRepo.softDelete(productId);
  }
}
