import { Controller, Post, Get, Put, Delete, Body, Param, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID, IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';
import { ProviderRepository } from '../../../infrastructure/persistence/typeorm/repositories/provider.repository';
import { Provider } from '../../../domain/entities/provider.entity';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';

export class CreateProviderDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  tax_id: string; // RIF

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsString()
  zone_code?: string;

  @IsOptional()
  @IsString()
  taxpayer_type?: string;

  @IsOptional()
  is_retention_agent?: boolean;

  @IsOptional()
  retention_percentage?: number;

  @IsOptional()
  islr_percentage?: number;

  @IsOptional()
  @IsString()
  islr_concept_code?: string;
}

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  tax_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsString()
  zone_code?: string;

  @IsOptional()
  @IsString()
  taxpayer_type?: string;

  @IsOptional()
  is_retention_agent?: boolean;

  @IsOptional()
  retention_percentage?: number;

  @IsOptional()
  islr_percentage?: number;

  @IsOptional()
  @IsString()
  islr_concept_code?: string;
}

@ApiTags('Providers')
@ApiBearerAuth()
@Controller('providers')
@UseGuards(JwtAuthGuard, ModulesGuard)
export class ProvidersController {
  constructor(private readonly providerRepo: ProviderRepository) {}

  @Post()
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiHeader({ name: 'x-tenant-id', required: false })
  async create(
    @Headers('x-tenant-id') headerTenantId: string,
    @Body() dto: CreateProviderDto,
    @Req() req: any,
  ) {
    const tenantId = this.validateTenant(headerTenantId, req);

    // Check if RIF already exists
    const existing = await this.providerRepo.findByTaxId(dto.tax_id);
    if (existing) {
      throw new BadRequestException(`El RIF '${dto.tax_id}' ya está registrado.`);
    }

    const provider = new Provider();
    provider.tenant_id = tenantId;
    provider.name = dto.name;
    provider.tax_id = dto.tax_id;
    provider.email = dto.email;
    provider.phone = dto.phone;
    provider.address = dto.address;
    provider.delivery_address = dto.delivery_address;
    provider.zone_code = dto.zone_code || 'DC';
    provider.taxpayer_type = dto.taxpayer_type || 'ORDINARY';
    provider.is_retention_agent = dto.is_retention_agent !== undefined ? dto.is_retention_agent : false;
    provider.retention_percentage = dto.retention_percentage !== undefined ? dto.retention_percentage : 75.00;
    provider.islr_percentage = dto.islr_percentage !== undefined ? dto.islr_percentage : 2.00;
    provider.islr_concept_code = dto.islr_concept_code || 'SERVICES';

    return this.providerRepo.save(provider);
  }

  @Get()
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Get all providers' })
  @ApiHeader({ name: 'x-tenant-id', required: false })
  async findAll(
    @Headers('x-tenant-id') headerTenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(headerTenantId, req);
    return this.providerRepo.findAll();
  }

  @Put(':id')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Update a provider' })
  @ApiHeader({ name: 'x-tenant-id', required: false })
  async update(
    @Param('id') id: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Body() dto: UpdateProviderDto,
    @Req() req: any,
  ) {
    this.validateTenant(headerTenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de proveedor inválido');
    }

    const provider = await this.providerRepo.findById(id);
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    if (dto.name !== undefined) provider.name = dto.name;
    if (dto.tax_id !== undefined) {
      const existing = await this.providerRepo.findByTaxId(dto.tax_id);
      if (existing && existing.id !== id) {
        throw new BadRequestException(`El RIF '${dto.tax_id}' ya está registrado por otro proveedor.`);
      }
      provider.tax_id = dto.tax_id;
    }
    if (dto.email !== undefined) provider.email = dto.email;
    if (dto.phone !== undefined) provider.phone = dto.phone;
    if (dto.address !== undefined) provider.address = dto.address;
    if (dto.delivery_address !== undefined) provider.delivery_address = dto.delivery_address;
    if (dto.zone_code !== undefined) provider.zone_code = dto.zone_code;
    if (dto.taxpayer_type !== undefined) provider.taxpayer_type = dto.taxpayer_type;
    if (dto.is_retention_agent !== undefined) provider.is_retention_agent = dto.is_retention_agent;
    if (dto.retention_percentage !== undefined) provider.retention_percentage = dto.retention_percentage;
    if (dto.islr_percentage !== undefined) provider.islr_percentage = dto.islr_percentage;
    if (dto.islr_concept_code !== undefined) provider.islr_concept_code = dto.islr_concept_code;

    return this.providerRepo.save(provider);
  }

  @Delete(':id')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Soft delete a provider' })
  @ApiHeader({ name: 'x-tenant-id', required: false })
  async remove(
    @Param('id') id: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(headerTenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de proveedor inválido');
    }

    const provider = await this.providerRepo.findById(id);
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    await this.providerRepo.softDelete(id);
    return { message: 'Provider successfully deactivated' };
  }

  @Post('bulk')
  @RequiredModules(AppModule.INVENTORY)
  @ApiOperation({ summary: 'Bulk create providers' })
  @ApiHeader({ name: 'x-tenant-id', required: false })
  async bulkCreate(
    @Headers('x-tenant-id') headerTenantId: string,
    @Body() providersPayload: CreateProviderDto[],
    @Req() req: any,
  ) {
    const tenantId = this.validateTenant(headerTenantId, req);

    if (!Array.isArray(providersPayload) || providersPayload.length === 0) {
      throw new BadRequestException('El cuerpo de la solicitud debe ser una lista no vacía de proveedores.');
    }

    const created: Provider[] = [];
    const errors: { line: number; name?: string; tax_id?: string; reason: string }[] = [];

    for (let i = 0; i < providersPayload.length; i++) {
      const item = providersPayload[i];
      const line = i + 1;

      if (!item.name || !item.name.trim()) {
        errors.push({ line, tax_id: item.tax_id, reason: 'El nombre o razón social es obligatorio.' });
        continue;
      }

      if (!item.tax_id || !item.tax_id.trim()) {
        errors.push({ line, name: item.name, reason: 'El R.I.F. es obligatorio.' });
        continue;
      }

      const formattedTaxId = item.tax_id.trim().toUpperCase();

      const existing = await this.providerRepo.findByTaxId(formattedTaxId);
      if (existing) {
        errors.push({ line, name: item.name, tax_id: formattedTaxId, reason: `El R.I.F. '${formattedTaxId}' ya está registrado.` });
        continue;
      }

      const provider = new Provider();
      provider.tenant_id = tenantId;
      provider.name = item.name.trim();
      provider.tax_id = formattedTaxId;
      provider.email = item.email ? item.email.trim().toLowerCase() : undefined;
      provider.phone = item.phone ? item.phone.trim() : undefined;
      provider.address = item.address ? item.address.trim() : undefined;
      provider.delivery_address = item.delivery_address ? item.delivery_address.trim() : undefined;
      provider.zone_code = item.zone_code || 'DC';
      provider.taxpayer_type = item.taxpayer_type || 'ORDINARY';
      provider.is_retention_agent = item.is_retention_agent !== undefined ? Boolean(item.is_retention_agent) : false;
      provider.retention_percentage = item.retention_percentage !== undefined ? Number(item.retention_percentage) : 75.00;
      provider.islr_percentage = item.islr_percentage !== undefined ? Number(item.islr_percentage) : 2.00;
      provider.islr_concept_code = item.islr_concept_code || 'SERVICES';

      try {
        const saved = await this.providerRepo.save(provider);
        created.push(saved);
      } catch (err: any) {
        errors.push({ line, name: item.name, tax_id: formattedTaxId, reason: err.message || 'Error al persistir proveedor' });
      }
    }

    return {
      success: errors.length === 0,
      totalProcessed: providersPayload.length,
      insertedCount: created.length,
      created,
      errors,
    };
  }

  private validateTenant(tenantId: string, req: any): string {
    const resolvedTenantId = tenantId || req.user?.tenant_id || req.headers?.['x-tenant-id'];
    if (!resolvedTenantId || !isUUID(resolvedTenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (req.user?.tenant_id && resolvedTenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return resolvedTenantId;
  }
}
