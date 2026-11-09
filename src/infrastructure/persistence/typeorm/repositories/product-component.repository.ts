import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { ProductComponent } from '../../../../domain/entities/product-component.entity';
import { BaseTenantRepository } from './base-tenant.repository';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../../domain/constants/domain.constants';

@Injectable({ scope: Scope.REQUEST })
export class ProductComponentRepository extends BaseTenantRepository<ProductComponent> {
  constructor(
    @InjectRepository(ProductComponent)
    private readonly repo: Repository<ProductComponent>,
    @Inject(REQUEST) request: any,
  ) {
    const tenantId =
      request?.user?.tenant_id ||
      request?.tenant_id ||
      request?.headers?.['x-tenant-id'] ||
      request?.headers?.['X-Tenant-Id'] ||
      BACKEND_SYSTEM_CONSTANTS.DEFAULT_SYSTEM_TENANT_ID;
    super(tenantId);
  }

  async findByParentId(parentProductId: string, tenantId?: string): Promise<ProductComponent[]> {
    const targetTenantId = tenantId || this.tenantId;
    return this.repo.find({
      where: { parent_product_id: parentProductId, tenant_id: targetTenantId },
      relations: ['child_product'],
      order: { created_at: 'ASC' },
    });
  }

  async findParentBundlesForChild(childProductId: string, tenantId?: string): Promise<ProductComponent[]> {
    const targetTenantId = tenantId || this.tenantId;
    return this.repo.find({
      where: { child_product_id: childProductId, tenant_id: targetTenantId },
      relations: ['parent_product'],
      order: { created_at: 'ASC' },
    });
  }

  async deleteByParentId(parentProductId: string, tenantId?: string): Promise<void> {
    const targetTenantId = tenantId || this.tenantId;
    await this.repo.delete({ parent_product_id: parentProductId, tenant_id: targetTenantId });
  }

  async saveComponents(components: ProductComponent[]): Promise<ProductComponent[]> {
    for (const comp of components) {
      if (!comp.tenant_id || comp.tenant_id === BACKEND_SYSTEM_CONSTANTS.DEFAULT_SYSTEM_TENANT_ID) {
        comp.tenant_id = this.tenantId;
      }
    }
    return this.repo.save(components);
  }
}
