import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { TenantActiveGuard } from '../../../infrastructure/auth/guards/tenant-active.guard';
import { BranchesUseCase } from '../../../application/use-cases/branches/branches.use-case';
import {
  CreateBranchDto,
  UpdateBranchDto,
  AssignBranchWarehouseDto,
} from '../../../application/use-cases/branches/dto/branch.dto';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../domain/constants/domain.constants';

@Controller('settings/branches')
@UseGuards(JwtAuthGuard, TenantActiveGuard)
export class BranchesController {
  constructor(private readonly branchesUseCase: BranchesUseCase) {}

  private getRequestContext(req: any) {
    const tenantId =
      req.user?.tenant_id ||
      req.user?.tenantId ||
      BACKEND_SYSTEM_CONSTANTS.DEFAULT_SYSTEM_TENANT_ID;
    const userRole = req.user?.role || 'CASHIER';
    return { tenantId, userRole };
  }

  @Get()
  async listBranches(@Req() req: any) {
    const { tenantId } = this.getRequestContext(req);
    return await this.branchesUseCase.listBranches(tenantId);
  }

  @Get(':id')
  async getBranchById(@Req() req: any, @Param('id') id: string) {
    const { tenantId } = this.getRequestContext(req);
    return await this.branchesUseCase.getBranchById(tenantId, id);
  }

  @Post()
  async createBranch(@Req() req: any, @Body() dto: CreateBranchDto) {
    const { tenantId, userRole } = this.getRequestContext(req);
    return await this.branchesUseCase.createBranch(tenantId, userRole, dto);
  }

  @Put(':id')
  async updateBranch(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    const { tenantId, userRole } = this.getRequestContext(req);
    return await this.branchesUseCase.updateBranch(tenantId, userRole, id, dto);
  }

  @Put(':id/warehouse')
  async assignWarehouse(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignBranchWarehouseDto,
  ) {
    const { tenantId, userRole } = this.getRequestContext(req);
    return await this.branchesUseCase.assignWarehouse(
      tenantId,
      userRole,
      id,
      dto.warehouseId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBranch(@Req() req: any, @Param('id') id: string) {
    const { tenantId, userRole } = this.getRequestContext(req);
    await this.branchesUseCase.deleteBranch(tenantId, userRole, id);
  }
}
