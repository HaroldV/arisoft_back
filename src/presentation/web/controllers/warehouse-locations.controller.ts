import { Controller, Post, Get, Delete, Body, Param, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID, IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseLocation, LocationType } from '../../../domain/entities/warehouse-location.entity';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';

export class CreateWarehouseLocationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEnum(LocationType)
  type: LocationType;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity_limit?: number;
}

@ApiTags('Warehouse Locations')
@ApiBearerAuth()
@Controller('inventory/warehouse-locations')
@UseGuards(JwtAuthGuard, ModulesGuard)
@RequiredModules(AppModule.INVENTORY)
export class WarehouseLocationsController {
  constructor(
    @InjectRepository(WarehouseLocation)
    private readonly locationRepo: Repository<WarehouseLocation>
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new warehouse location or sub-location' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateWarehouseLocationDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);

    if (dto.parent_id) {
      if (!isUUID(dto.parent_id)) {
        throw new BadRequestException('parent_id must be a valid UUID');
      }
      const parent = await this.locationRepo.findOne({
        where: { id: dto.parent_id, tenant_id: tenantId }
      });
      if (!parent) {
        throw new NotFoundException('Parent location not found');
      }
    }

    const location = new WarehouseLocation({
      tenant_id: tenantId,
      name: dto.name.trim(),
      type: dto.type,
      parent_id: dto.parent_id || null,
      capacity_limit: dto.capacity_limit || 0,
    });

    return this.locationRepo.save(location);
  }

  @Get()
  @ApiOperation({ summary: 'Get all warehouse locations for the tenant' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    return this.locationRepo.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' }
    });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get all warehouse locations in hierarchical tree' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async getTree(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    const all = await this.locationRepo.find({
      where: { tenant_id: tenantId }
    });

    // Build hierarchical tree
    const rootNodes: WarehouseLocation[] = [];
    const childrenMap = new Map<string, WarehouseLocation[]>();

    all.forEach(node => {
      if (!node.parent_id) {
        rootNodes.push(node);
      } else {
        const parentId = node.parent_id;
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId).push(node);
      }
    });

    const populateChildren = (node: WarehouseLocation) => {
      node.children = childrenMap.get(node.id) || [];
      node.children.forEach(populateChildren);
    };

    rootNodes.forEach(populateChildren);
    return rootNodes;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete warehouse location' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async delete(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID inválido');
    }

    const location = await this.locationRepo.findOne({
      where: { id, tenant_id: tenantId }
    });
    if (!location) {
      throw new NotFoundException('Ubicación no encontrada');
    }

    // Prevent deletion if it has children
    const childCount = await this.locationRepo.count({
      where: { parent_id: id }
    });
    if (childCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la ubicación '${location.name}' porque contiene sub-ubicaciones.`
      );
    }

    await this.locationRepo.delete(id);
    return { message: 'Ubicación eliminada con éxito' };
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
