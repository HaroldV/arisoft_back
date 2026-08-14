import { Controller, Get, Put, Body, Headers, Req, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { GetCompanyProfileUseCase } from '../../../application/use-cases/tenant/get-company-profile.use-case';
import { UpdateCompanyProfileUseCase } from '../../../application/use-cases/tenant/update-company-profile.use-case';
import { UpdateCompanyProfileDto } from '../../../application/use-cases/tenant/dto/update-company-profile.dto';

@ApiTags('Tenant Profile')
@ApiBearerAuth()
@Controller('tenant/profile')
@UseGuards(JwtAuthGuard)
export class TenantProfileController {
  constructor(
    private readonly getCompanyProfileUseCase: GetCompanyProfileUseCase,
    private readonly updateCompanyProfileUseCase: UpdateCompanyProfileUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get company profile details' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  async getProfile(
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    return this.getCompanyProfileUseCase.execute(tenantId);
  }

  @Put()
  @ApiOperation({ summary: 'Update company profile details (SENIAT compliance)' })
  @ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
  @ApiBody({ type: UpdateCompanyProfileDto })
  async updateProfile(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateCompanyProfileDto,
    @Req() req: any,
  ) {
    if (!tenantId || !isUUID(tenantId)) {
      throw new BadRequestException('x-tenant-id must be a valid UUID');
    }
    if (tenantId !== req.user.tenant_id) {
      throw new ForbiddenException('Tenant ID does not match authenticated session');
    }
    const role = req.user.role;
    if (role !== 'OWNER' && role !== 'MANAGER') {
      throw new ForbiddenException('Only owners and managers are allowed to configure the company profile');
    }
    return this.updateCompanyProfileUseCase.execute(tenantId, role, dto);
  }
}
