import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { Sale } from '../../../domain/entities/sale.entity';

@Injectable()
export class GetCompanyProfileUseCase {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
  ) {}

  async execute(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const salesCount = await this.saleRepo.count({ where: { tenant_id: tenantId } });

    return {
      id: tenant.id,
      company_name: tenant.company_name,
      tax_id: tenant.tax_id,
      plan_type: tenant.plan_type,
      trial_expires_at: tenant.trial_expires_at,
      settings: tenant.settings,
      is_active: tenant.is_active,
      commercial_name: tenant.commercial_name || '',
      fiscal_address: tenant.fiscal_address || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      taxpayer_type: tenant.taxpayer_type,
      is_withholding_agent: tenant.is_withholding_agent,
      logo_url: tenant.logo_url || '',
      receipt_footer: tenant.receipt_footer || '',
      hasIssuedInvoices: salesCount > 0,
    };
  }
}
