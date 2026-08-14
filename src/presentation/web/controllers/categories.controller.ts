import { Controller, Post, Get, Put, Delete, Body, Param, Headers, UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CategoryRepository } from '../../../infrastructure/persistence/typeorm/repositories/category.repository';
import { Category } from '../../../domain/entities/category.entity';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../domain/entities/product.entity';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  is_active?: boolean;
}

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('inventory/categories')
@UseGuards(JwtAuthGuard, ModulesGuard)
@RequiredModules(AppModule.INVENTORY)
export class CategoriesController {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    @InjectRepository(Product)
    private readonly typeormProductRepo: Repository<Product>
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create custom category' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCategoryDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);

    // Check if category name already exists (tenant specific or global)
    const existing = await this.categoryRepo.findByName(dto.name);
    if (existing && existing.tenant_id === tenantId) {
      throw new BadRequestException(`La categoría '${dto.name}' ya está registrada.`);
    }

    const category = new Category({
      tenant_id: tenantId,
      name: dto.name.trim(),
      code: dto.code?.trim() || null,
      is_active: true,
    });

    return this.categoryRepo.save(category);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories (global + tenant)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('all') all: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (all === 'true') {
      return this.categoryRepo.findTenantCategoriesAll();
    }
    return this.categoryRepo.findTenantCategories();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update or shadow a category' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de categoría inválido');
    }

    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Shadowing Logic: If the category is global, create a copy for the tenant
    if (category.tenant_id === null) {
      const nameToUse = dto.name !== undefined ? dto.name.trim() : category.name;
      const codeToUse = dto.code !== undefined ? dto.code.trim() : category.code;
      const activeToUse = dto.is_active !== undefined ? dto.is_active : category.is_active;

      // Check if a shadowed version already exists
      const existingShadow = await this.categoryRepo.findByName(category.name);
      if (existingShadow && existingShadow.tenant_id === tenantId) {
        if (dto.name !== undefined) existingShadow.name = dto.name.trim();
        if (dto.code !== undefined) existingShadow.code = dto.code.trim() || null;
        if (dto.is_active !== undefined) existingShadow.is_active = dto.is_active;
        return this.categoryRepo.save(existingShadow);
      }

      const shadowCategory = new Category({
        tenant_id: tenantId,
        name: nameToUse,
        code: codeToUse,
        is_active: activeToUse,
      });
      return this.categoryRepo.save(shadowCategory);
    }

    // Traditional local category update
    if (dto.name !== undefined) category.name = dto.name.trim();
    if (dto.code !== undefined) category.code = dto.code.trim() || null;
    if (dto.is_active !== undefined) category.is_active = dto.is_active;

    return this.categoryRepo.save(category);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete or disable category' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async delete(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de categoría inválido');
    }

    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // If it's a global category, disable it locally (shadow with is_active = false)
    if (category.tenant_id === null) {
      const existingShadow = await this.categoryRepo.findByName(category.name);
      if (existingShadow && existingShadow.tenant_id === tenantId) {
        existingShadow.is_active = false;
        await this.categoryRepo.save(existingShadow);
        return { message: 'Categoría global desactivada localmente con éxito' };
      }

      const shadow = new Category({
        tenant_id: tenantId,
        name: category.name,
        code: category.code,
        is_active: false,
      });
      await this.categoryRepo.save(shadow);
      return { message: 'Categoría global desactivada localmente con éxito' };
    }

    // Check if category is used by any products before deleting
    const productCount = await this.typeormProductRepo.count({
      where: { category_id: id, tenant_id: tenantId },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría '${category.name}' porque está siendo utilizada por ${productCount} producto(s).`
      );
    }

    await this.categoryRepo.delete(id);
    return { message: 'Categoría eliminada con éxito' };
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
