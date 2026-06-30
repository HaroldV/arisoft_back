import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Product } from '../../../../domain/entities/product.entity';
import { StockMove } from '../../../../domain/entities/stock-move.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class ProductRepository extends BaseTenantRepository<Product> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(REQUEST) request: any,
  ) {
    const tenantId = request?.tenant_id || request?.headers?.['x-tenant-id'] || (process.env.NODE_ENV === 'test' ? 'test-tenant' : undefined);
    super(tenantId);
  }

  async findBySkus(skus: string[]): Promise<Product[]> {
    if (skus.length === 0) return [];
    const conditions = this.enforceTenantCondition({});
    return this.productRepository.find({
      where: {
        ...conditions,
        sku: In(skus),
      },
    });
  }

  async findById(id: string): Promise<Product | null> {
    const conditions = this.enforceTenantCondition({ id });
    return this.productRepository.findOne({ where: conditions });
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const conditions = this.enforceTenantCondition({});
    return this.productRepository.find({
      where: {
        ...conditions,
        id: In(ids),
      },
    });
  }

  async findByTenant(tenantId: string): Promise<Product[]> {
    const conditions = this.enforceTenantCondition({});
    return this.productRepository.find({ where: conditions });
  }

  async save(product: Product): Promise<Product> {
    product.tenant_id = this.tenantId;
    return this.productRepository.save(product);
  }

  async saveMany(products: Product[]): Promise<Product[]> {
    for (const product of products) {
      product.tenant_id = this.tenantId;
    }
    return this.productRepository.save(products);
  }

  async softDelete(id: string): Promise<void> {
    const conditions = this.enforceTenantCondition({ id });
    await this.productRepository.softDelete(conditions);
  }

  async findProductsWithStock(filters: { sku?: string; name?: string } = {}): Promise<Product[]> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoin(StockMove, 'move', 'move.product_id = product.id')
      .select('product.id', 'id')
      .addSelect('product.tenant_id', 'tenant_id')
      .addSelect('product.sku', 'sku')
      .addSelect('product.name', 'name')
      .addSelect('product.description', 'description')
      .addSelect('product.cost_usd', 'cost_usd')
      .addSelect('product.price_usd', 'price_usd')
      .addSelect('product.tax_rate', 'tax_rate')
      .addSelect('product.created_at', 'created_at')
      .addSelect('product.updated_at', 'updated_at')
      .addSelect('COALESCE(SUM(move.quantity), 0)', 'current_stock')
      .where('product.tenant_id = :tenantId', { tenantId: this.tenantId })
      .andWhere('product.deleted_at IS NULL');

    if (filters.sku) {
      query.andWhere('product.sku = :sku', { sku: filters.sku.trim() });
    }

    if (filters.name) {
      query.andWhere('product.name ILIKE :name', { name: `%${filters.name.trim()}%` });
    }

    query.groupBy('product.id');

    const rawResults = await query.getRawMany();

    return rawResults.map(r => new Product({
      id: r.id,
      tenant_id: r.tenant_id,
      sku: r.sku,
      name: r.name,
      description: r.description,
      cost_usd: parseFloat(r.cost_usd),
      price_usd: parseFloat(r.price_usd),
      tax_rate: parseFloat(r.tax_rate),
      current_stock: parseInt(r.current_stock, 10),
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at),
    }));
  }
}
