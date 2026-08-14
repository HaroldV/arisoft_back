# Code Review Prompt: Blind Hunter

You are the **Blind Hunter** code reviewer subagent. Your role is to look at the diff output adversarially, without any specification or project context, and find bugs, design issues, type errors, or security concerns.

## Review Target (Diff Output)

Please review the diff from the patch file located at `_bmad-output/implementation-artifacts/diff.patch`.

Alternatively, here are the core code changes in the staged diff:

```typescript
// backend/src/infrastructure/persistence/postgresql/repositories/product.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../../domain/entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findByTenant(tenantId: string): Promise<Product[]> {
    return this.productRepository.find({ where: { tenant_id: tenantId } });
  }

  async save(product: Product): Promise<Product> {
    return this.productRepository.save(product);
  }

  async saveMany(products: Product[]): Promise<Product[]> {
    return this.productRepository.save(products);
  }
}
```

```typescript
// backend/src/infrastructure/persistence/postgresql/repositories/stock-move.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMove } from '../../../../domain/entities/stock-move.entity';

@Injectable()
export class StockMoveRepository {
  constructor(
    @InjectRepository(StockMove)
    private readonly stockMoveRepository: Repository<StockMove>,
  ) {}

  async save(move: StockMove): Promise<StockMove> {
    return this.stockMoveRepository.save(move);
  }

  async findByProduct(tenantId: string, productId: string): Promise<StockMove[]> {
    return this.stockMoveRepository.find({
      where: { tenant_id: tenantId, product_id: productId },
      order: { created_at: 'DESC' },
    });
  }
}
```

```typescript
// backend/src/application/use-cases/inventory/bulk-upload-products.use-case.ts
import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './create-product.dto';
import { ProductRepository } from '../../../infrastructure/persistence/postgresql/repositories/product.repository';
import { StockMoveRepository } from '../../../infrastructure/persistence/postgresql/repositories/stock-move.repository';
import { StockMoveType } from '../../../domain/entities/stock-move.entity';
import { Product } from '../../../domain/entities/product.entity';

@Injectable()
export class BulkUploadProductsUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly stockMoveRepo: StockMoveRepository,
  ) {}

  async execute(tenantId: string, products: CreateProductDto[]) {
    const results = {
      success: [],
      errors: [],
    };

    const tenantProducts = await this.productRepo.findByTenant(tenantId);
    const existingSkus = new Set(tenantProducts.map(p => p.sku));

    for (const [index, productData] of products.entries()) {
      try {
        if (existingSkus.has(productData.sku)) {
          throw new Error(`SKU already exists: ${productData.sku}`);
        }

        const product = await this.productRepo.save(new Product({
          tenant_id: tenantId,
          sku: productData.sku,
          name: productData.name,
          description: productData.sku,
          cost_usd: productData.costUsd,
          price_usd: productData.priceUsd,
          tax_rate: productData.taxRate,
          current_stock: productData.initialStock,
        }));

        const move = await this.stockMoveRepo.save({
          tenant_id: tenantId,
          product_id: product.id,
          type: StockMoveType.INITIAL_LOAD,
          quantity: productData.initialStock,
          cost_at_time: productData.costUsd,
        } as any);

        results.success.push({ sku: productData.sku, productId: product.id, moveId: move.id });
        existingSkus.add(productData.sku);
      } catch (error) {
        results.errors.push({ line: index + 1, sku: productData.sku, error: error.message });
      }
    }

    return results;
  }
}
```

```typescript
// backend/src/presentation/web/controllers/inventory.controller.ts
import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { BulkUploadProductsUseCase } from '../../../application/use-cases/inventory/bulk-upload-products.use-case';
import { CreateProductDto } from '../../../application/use-cases/inventory/create-product.dto';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(ModulesGuard)
export class InventoryController {
  constructor(private readonly bulkUploadUseCase: BulkUploadProductsUseCase) {}

  @Post('products')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Create products and initialize stock' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async createProduct(
    @Headers('x-tenant-id') tenantId: string,
    @Body() products: CreateProductDto[],
  ) {
    return this.bulkUploadUseCase.execute(tenantId, products);
  }
}
```

## Output Requirements

Analyze this diff. Do not assume or read specs/context. Find design, runtime, and schema issues in this diff and list them clearly with file name, code snippet, and rationale.
