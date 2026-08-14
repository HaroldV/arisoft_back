import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Product } from '../../../../domain/entities/product.entity';
import { StockMove } from '../../../../domain/entities/stock-move.entity';
import { User } from '../../../../domain/entities/user.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class ProductRepository extends BaseTenantRepository<Product> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(REQUEST) request: any,
  ) {
    const tenantId = 
      request?.user?.tenant_id || 
      request?.tenant_id || 
      request?.headers?.['x-tenant-id'] || 
      request?.headers?.['X-Tenant-Id'] || 
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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
      .leftJoin('categories', 'cat', 'cat.id = product.category_id')
      .leftJoin(User, 'creator', 'creator.id = product.created_by_user_id')
      .leftJoin(User, 'updater', 'updater.id = product.updated_by_user_id')
      .select('product.id', 'id')
      .addSelect('product.tenant_id', 'tenant_id')
      .addSelect('product.sku', 'sku')
      .addSelect('product.name', 'name')
      .addSelect('product.description', 'description')
      .addSelect('product.cost_usd', 'cost_usd')
      .addSelect('product.price_usd', 'price_usd')
      .addSelect('product.tax_rate', 'tax_rate')
      .addSelect('product.tax_type', 'tax_type')
      .addSelect('product.is_perishable', 'is_perishable')
      .addSelect('product.has_batch_control', 'has_batch_control')
      .addSelect('product.image_url', 'image_url')
      .addSelect('product.created_by_user_id', 'created_by_user_id')
      .addSelect('creator.full_name', 'created_by_user_name')
      .addSelect('product.updated_by_user_id', 'updated_by_user_id')
      .addSelect('updater.full_name', 'updated_by_user_name')
      .addSelect('product.unit_of_measure', 'unit_of_measure')
      .addSelect('cat.name', 'category')
      .addSelect('product.category_id', 'category_id')
      .addSelect('product.variations', 'variations')
      .addSelect('product.advanced_fields', 'advanced_fields')
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

    query.groupBy(
      'product.id, cat.name, creator.full_name, updater.full_name, product.tenant_id, product.sku, product.name, product.description, product.cost_usd, product.price_usd, product.tax_rate, product.tax_type, product.is_perishable, product.has_batch_control, product.image_url, product.created_by_user_id, product.updated_by_user_id, product.unit_of_measure, product.category_id, product.variations, product.advanced_fields, product.created_at, product.updated_at'
    );

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
      tax_type: r.tax_type,
      is_perishable: r.is_perishable,
      has_batch_control: r.has_batch_control,
      image_url: r.image_url,
      imageUrl: r.image_url,
      created_by_user_id: r.created_by_user_id,
      created_by_user_name: r.created_by_user_name,
      updated_by_user_id: r.updated_by_user_id,
      updated_by_user_name: r.updated_by_user_name,
      unit_of_measure: r.unit_of_measure,
      category: r.category,
      category_id: r.category_id,
      variations: r.variations,
      advanced_fields: r.advanced_fields,
      current_stock: parseInt(r.current_stock, 10),
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at),
    }));
  }
}
