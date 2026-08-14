import { Controller, Post, Get, Put, Delete, Body, Param, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID, IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';
import { ClientRepository } from '../../../infrastructure/persistence/typeorm/repositories/client.repository';
import { Client } from '../../../domain/entities/client.entity';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  tax_id: string; // Cédula o RIF

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
}

export class UpdateClientDto {
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
}

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, ModulesGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientRepo: ClientRepository) {}

  @Post()
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('clients:manage')
  @ApiOperation({ summary: 'Create a new client' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateClientDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);

    // Check if taxId already exists
    const existing = await this.clientRepo.findByTaxId(dto.tax_id);
    if (existing) {
      throw new BadRequestException(`El documento/RIF '${dto.tax_id}' ya está registrado.`);
    }

    const client = new Client();
    client.tenant_id = tenantId;
    client.name = dto.name;
    client.tax_id = dto.tax_id;
    client.email = dto.email;
    client.phone = dto.phone;
    client.address = dto.address;
    client.delivery_address = dto.delivery_address;
    client.zone_code = dto.zone_code || 'DC';
    client.taxpayer_type = dto.taxpayer_type || 'EXEMPT';

    return this.clientRepo.save(client);
  }

  @Get()
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('clients:manage')
  @ApiOperation({ summary: 'Get all clients' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    return this.clientRepo.findAll();
  }

  @Put(':id')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('clients:manage')
  @ApiOperation({ summary: 'Update a client' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateClientDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de cliente inválido');
    }

    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (dto.name !== undefined) client.name = dto.name;
    if (dto.tax_id !== undefined) {
      const existing = await this.clientRepo.findByTaxId(dto.tax_id);
      if (existing && existing.id !== id) {
        throw new BadRequestException(`El documento/RIF '${dto.tax_id}' ya está registrado.`);
      }
      client.tax_id = dto.tax_id;
    }
    if (dto.email !== undefined) client.email = dto.email;
    if (dto.phone !== undefined) client.phone = dto.phone;
    if (dto.address !== undefined) client.address = dto.address;
    if (dto.delivery_address !== undefined) client.delivery_address = dto.delivery_address;
    if (dto.zone_code !== undefined) client.zone_code = dto.zone_code;
    if (dto.taxpayer_type !== undefined) client.taxpayer_type = dto.taxpayer_type;

    return this.clientRepo.save(client);
  }

  @Delete(':id')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('clients:manage')
  @ApiOperation({ summary: 'Soft delete a client' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async delete(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de cliente inválido');
    }

    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    await this.clientRepo.softDelete(id);
    return { message: 'Client successfully deactivated' };
  }

  private validateTenant(tenantId: string, req: any) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    const sessionTenantId = req.user?.tenant_id || req.user?.tenantId;
    if (sessionTenantId && tenantId !== sessionTenantId) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
  }
}
