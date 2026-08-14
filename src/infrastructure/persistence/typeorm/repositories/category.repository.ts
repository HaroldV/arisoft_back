import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Category } from '../../../../domain/entities/category.entity';
import { BaseTenantRepository } from './base-tenant.repository';

@Injectable({ scope: Scope.REQUEST })
export class CategoryRepository extends BaseTenantRepository<Category> {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
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

  async findTenantCategories(): Promise<Category[]> {
    const raw = await this.categoryRepository.query(
      `SELECT DISTINCT ON (LOWER(name))
         id, tenant_id, name, code, is_active, created_at, updated_at
       FROM categories
       WHERE (tenant_id = $1 OR tenant_id IS NULL) AND is_active = true
       ORDER BY LOWER(name) ASC, (tenant_id IS NOT NULL) DESC`,
      [this.tenantId]
    );

    return raw.map(r => new Category({
      id: r.id,
      tenant_id: r.tenant_id,
      name: r.name,
      code: r.code,
      is_active: r.is_active,
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at)
    }));
  }

  async findTenantCategoriesAll(): Promise<Category[]> {
    // Returns categories including inactive ones for categories management view
    const raw = await this.categoryRepository.query(
      `SELECT DISTINCT ON (LOWER(name))
         id, tenant_id, name, code, is_active, created_at, updated_at
       FROM categories
       WHERE tenant_id = $1 OR tenant_id IS NULL
       ORDER BY LOWER(name) ASC, (tenant_id IS NOT NULL) DESC`,
      [this.tenantId]
    );

    return raw.map(r => new Category({
      id: r.id,
      tenant_id: r.tenant_id,
      name: r.name,
      code: r.code,
      is_active: r.is_active,
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at)
    }));
  }

  async findById(id: string): Promise<Category | null> {
    return this.categoryRepository.findOne({
      where: [
        { id, tenant_id: this.tenantId },
        { id, tenant_id: null }
      ]
    });
  }

  async findByName(name: string): Promise<Category | null> {
    const nameTrim = name.trim().toLowerCase();
    const raw = await this.categoryRepository.query(
      `SELECT id, tenant_id, name, code, is_active, created_at, updated_at
       FROM categories
       WHERE (tenant_id = $1 OR tenant_id IS NULL) AND LOWER(name) = $2
       ORDER BY (tenant_id IS NOT NULL) DESC
       LIMIT 1`,
      [this.tenantId, nameTrim]
    );

    if (raw.length === 0) return null;
    const r = raw[0];
    return new Category({
      id: r.id,
      tenant_id: r.tenant_id,
      name: r.name,
      code: r.code,
      is_active: r.is_active,
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at)
    });
  }

  async findOrCreateByName(name: string): Promise<Category> {
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    const newCategory = this.categoryRepository.create({
      tenant_id: this.tenantId,
      name: name.trim(),
      code: null,
      is_active: true
    });
    return this.categoryRepository.save(newCategory);
  }

  async save(category: Category): Promise<Category> {
    // If it's a new or tenant specific category, set tenant_id
    if (category.tenant_id !== null) {
      category.tenant_id = this.tenantId;
    }
    return this.categoryRepository.save(category);
  }

  async delete(id: string): Promise<void> {
    // Only delete custom categories owned by tenant
    await this.categoryRepository.delete({ id, tenant_id: this.tenantId });
  }
}
