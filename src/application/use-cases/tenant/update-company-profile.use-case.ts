import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { Sale } from '../../../domain/entities/sale.entity';
import { UserRole } from '../../../domain/entities/user.entity';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Injectable()
export class UpdateCompanyProfileUseCase {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
  ) {}

  async execute(tenantId: string, role: string, dto: UpdateCompanyProfileDto) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const isOwner = role === UserRole.OWNER;

    // 1. Role validation: Only OWNER can change legal identity fields
    if (!isOwner) {
      const hasLegalModifications = 
        (dto.company_name !== undefined && dto.company_name !== tenant.company_name) ||
        (dto.tax_id !== undefined && dto.tax_id !== tenant.tax_id) ||
        (dto.taxpayer_type !== undefined && dto.taxpayer_type !== tenant.taxpayer_type) ||
        (dto.fiscal_address !== undefined && dto.fiscal_address !== tenant.fiscal_address);

      if (hasLegalModifications) {
        throw new ForbiddenException('Only the tenant OWNER can modify legal company settings');
      }
    }

    // 2. Fiscal consistency validation: Lock RIF and Legal Name if invoices already exist
    const changingFiscalIdentity =
      (dto.company_name !== undefined && dto.company_name !== tenant.company_name) ||
      (dto.tax_id !== undefined && dto.tax_id !== tenant.tax_id);

    if (changingFiscalIdentity) {
      const salesCount = await this.saleRepo.count({ where: { tenant_id: tenantId } });
      if (salesCount > 0) {
        throw new BadRequestException(
          'No se puede modificar la Razón Social o el RIF después de haber emitido facturas en el sistema'
        );
      }
    }

    // Apply legal updates (OWNER only)
    if (isOwner) {
      if (dto.company_name !== undefined) tenant.company_name = dto.company_name;
      if (dto.tax_id !== undefined) tenant.tax_id = dto.tax_id;
      if (dto.taxpayer_type !== undefined) tenant.taxpayer_type = dto.taxpayer_type;
      if (dto.fiscal_address !== undefined) tenant.fiscal_address = dto.fiscal_address;
      if (dto.is_withholding_agent !== undefined) tenant.is_withholding_agent = dto.is_withholding_agent;
    }

    // Apply operational updates (OWNER and MANAGER)
    if (dto.commercial_name !== undefined) tenant.commercial_name = dto.commercial_name;
    if (dto.phone !== undefined) tenant.phone = dto.phone;
    if (dto.email !== undefined) tenant.email = dto.email;
    if (dto.logo_url !== undefined) tenant.logo_url = dto.logo_url;
    if (dto.receipt_footer !== undefined) tenant.receipt_footer = dto.receipt_footer;
    if (dto.settings !== undefined) {
      tenant.settings = {
        ...tenant.settings,
        ...dto.settings,
      };
    }

    await this.tenantRepo.save(tenant);

    return {
      message: 'Perfil de la empresa actualizado correctamente',
      tenantId: tenant.id,
    };
  }
}
