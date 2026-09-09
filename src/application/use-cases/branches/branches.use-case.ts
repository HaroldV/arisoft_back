import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { BranchRepository } from '../../../infrastructure/persistence/typeorm/repositories/branch.repository';
import { Branch } from '../../../domain/entities/branch.entity';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { BACKEND_SYSTEM_CONSTANTS, SaasPlanEnum } from '../../../domain/constants/domain.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../../domain/entities/tenant.entity';
import { WarehouseLocation } from '../../../domain/entities/warehouse-location.entity';

@Injectable()
export class BranchesUseCase {
  constructor(
    private readonly branchRepo: BranchRepository,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(WarehouseLocation)
    private readonly warehouseRepo: Repository<WarehouseLocation>,
  ) {}

  async listBranches(tenantId: string): Promise<Branch[]> {
    return this.branchRepo.findByTenantId(tenantId);
  }

  async getBranchById(tenantId: string, id: string): Promise<Branch> {
    const branch = await this.branchRepo.findById(tenantId, id);
    if (!branch) {
      throw new NotFoundException(`La sucursal con ID ${id} no existe.`);
    }
    return branch;
  }

  async createBranch(tenantId: string, userRole: string, dto: CreateBranchDto): Promise<Branch> {
    this.assertOwnerRole(userRole);

    // 1. Validate Plan Limits
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const currentPlan = (tenant?.plan_type || SaasPlanEnum.EMPRENDEDOR) as SaasPlanEnum;
    const planConfig = BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS[currentPlan] || BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS.EMPRENDEDOR;
    const maxBranches = planConfig.BRANCHES || 1;

    const currentCount = await this.branchRepo.countByTenantId(tenantId);
    if (currentCount >= maxBranches) {
      throw new BadRequestException(
        `Has alcanzado el límite máximo de sucursales (${maxBranches}) para el plan ${currentPlan}. Actualiza tu suscripción para habilitar más sucursales.`
      );
    }

    // 2. Check unique code
    const existingCode = await this.branchRepo.findByCode(tenantId, dto.code);
    if (existingCode) {
      throw new ConflictException(`Ya existe una sucursal con el código '${dto.code}'.`);
    }

    // 3. Validate warehouse if provided
    if (dto.defaultWarehouseId) {
      const warehouse = await this.warehouseRepo.findOne({
        where: { id: dto.defaultWarehouseId, tenant_id: tenantId },
      });
      if (!warehouse) {
        throw new NotFoundException(`El almacén seleccionado no existe.`);
      }
    }

    // 4. Handle isMain logic
    if (dto.isMain) {
      await this.demoteCurrentMainBranch(tenantId);
    } else if (currentCount === 0) {
      // First branch is automatically main
      dto.isMain = true;
    }

    const branch = new Branch({
      tenant_id: tenantId,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      address: dto.address?.trim() || undefined,
      phone: dto.phone?.trim() || undefined,
      default_warehouse_id: dto.defaultWarehouseId || undefined,
      is_active: dto.isActive !== undefined ? dto.isActive : true,
      is_main: dto.isMain !== undefined ? dto.isMain : false,
    });

    return await this.branchRepo.save(branch);
  }

  async updateBranch(tenantId: string, userRole: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    this.assertOwnerRole(userRole);

    const branch = await this.getBranchById(tenantId, id);

    if (dto.code && dto.code.trim().toUpperCase() !== branch.code) {
      const existingCode = await this.branchRepo.findByCode(tenantId, dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(`Ya existe otra sucursal con el código '${dto.code}'.`);
      }
      branch.code = dto.code.trim().toUpperCase();
    }

    if (dto.defaultWarehouseId !== undefined) {
      if (dto.defaultWarehouseId) {
        const warehouse = await this.warehouseRepo.findOne({
          where: { id: dto.defaultWarehouseId, tenant_id: tenantId },
        });
        if (!warehouse) {
          throw new NotFoundException(`El almacén seleccionado no existe.`);
        }
        branch.default_warehouse_id = dto.defaultWarehouseId;
      } else {
        branch.default_warehouse_id = undefined;
      }
    }

    if (dto.isMain && !branch.is_main) {
      await this.demoteCurrentMainBranch(tenantId);
      branch.is_main = true;
    } else if (dto.isMain === false && branch.is_main) {
      branch.is_main = false;
    }

    if (dto.name !== undefined) branch.name = dto.name.trim();
    if (dto.address !== undefined) branch.address = dto.address.trim() || undefined;
    if (dto.phone !== undefined) branch.phone = dto.phone.trim() || undefined;
    if (dto.isActive !== undefined) branch.is_active = dto.isActive;

    return await this.branchRepo.save(branch);
  }

  async assignWarehouse(tenantId: string, userRole: string, branchId: string, warehouseId: string): Promise<Branch> {
    this.assertOwnerRole(userRole);

    const branch = await this.getBranchById(tenantId, branchId);
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: warehouseId, tenant_id: tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException(`El almacén con ID ${warehouseId} no existe.`);
    }

    branch.default_warehouse_id = warehouseId;
    return await this.branchRepo.save(branch);
  }

  async deleteBranch(tenantId: string, userRole: string, id: string): Promise<void> {
    this.assertOwnerRole(userRole);

    const branch = await this.getBranchById(tenantId, id);
    if (branch.is_main) {
      throw new BadRequestException('No se puede eliminar la sucursal principal del comercio.');
    }

    await this.branchRepo.delete(tenantId, id);
  }

  private assertOwnerRole(userRole: string): void {
    if (userRole !== 'OWNER' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Solo el Propietario (OWNER) de la empresa tiene permisos para gestionar sucursales y asignar almacenes.');
    }
  }

  private async demoteCurrentMainBranch(tenantId: string): Promise<void> {
    const branches = await this.branchRepo.findByTenantId(tenantId);
    const mainBranch = branches.find(b => b.is_main);
    if (mainBranch) {
      mainBranch.is_main = false;
      await this.branchRepo.save(mainBranch);
    }
  }
}
