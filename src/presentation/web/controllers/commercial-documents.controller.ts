import { Controller, Get, Post, Patch, Body, Param, Query, Headers, UseGuards, Req, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { CommercialDocumentRepository } from '../../../infrastructure/persistence/typeorm/repositories/commercial-document.repository';
import { CreateCommercialDocumentUseCase } from '../../../application/use-cases/sales/create-commercial-document.use-case';
import { ConvertCommercialDocumentUseCase } from '../../../application/use-cases/sales/convert-commercial-document.use-case';
import { CreateCommercialDocumentDto } from '../../../application/use-cases/sales/dto/create-commercial-document.dto';
import { CommercialDocumentType } from '../../../domain/entities/commercial-document.entity';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../../../infrastructure/auth/guards/modules.guard';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredModules, AppModule } from '../../../infrastructure/auth/decorators/modules.decorator';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';

@ApiTags('Commercial Documents')
@ApiBearerAuth()
@Controller('sales/documents')
@UseGuards(JwtAuthGuard, ModulesGuard, PermissionsGuard)
export class CommercialDocumentsController {
  constructor(
    private readonly documentRepository: CommercialDocumentRepository,
    private readonly createDocumentUseCase: CreateCommercialDocumentUseCase,
    private readonly convertDocumentUseCase: ConvertCommercialDocumentUseCase,
  ) {}

  @Get()
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('pos:create')
  @ApiOperation({ summary: 'Get commercial documents list (Quotations, Orders, Deliveries)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async getDocuments(
    @Headers('x-tenant-id') tenantId: string,
    @Query('type') type: CommercialDocumentType,
    @Query('search') search: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    const docType = type || CommercialDocumentType.QUOTATION;
    return this.documentRepository.findByType(tenantId, docType, search);
  }

  @Get(':id')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('pos:create')
  @ApiOperation({ summary: 'Get commercial document detail' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async getDocumentById(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de documento inválido');
    }
    const doc = await this.documentRepository.findById(id);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new NotFoundException('Documento no encontrado');
    }
    return doc;
  }

  @Post()
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('pos:create')
  @ApiOperation({ summary: 'Create new commercial document' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async createDocument(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCommercialDocumentDto,
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    const user = { id: req.user.sub, name: req.user.full_name || req.user.email };
    return this.createDocumentUseCase.execute(tenantId, dto, user);
  }

  @Post(':id/convert')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('pos:create')
  @ApiOperation({ summary: '1-Click Convert Document to next stage' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async convertDocument(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { target_type: CommercialDocumentType; carrier_name?: string; vehicle_plate?: string; driver_name?: string },
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de documento inválido');
    }
    const user = { id: req.user.sub, name: req.user.full_name || req.user.email };
    return this.convertDocumentUseCase.execute(
      tenantId,
      id,
      body.target_type,
      user,
      {
        carrier_name: body.carrier_name,
        vehicle_plate: body.vehicle_plate,
        driver_name: body.driver_name,
      },
    );
  }

  @Patch(':id/status')
  @RequiredModules(AppModule.POS)
  @RequiredPermissions('pos:create')
  @ApiOperation({ summary: 'Update commercial document status' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  async updateDocumentStatus(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { status: string; payment_method?: string },
    @Req() req: any,
  ) {
    this.validateTenant(tenantId, req);
    if (!id || !isUUID(id)) {
      throw new BadRequestException('ID de documento inválido');
    }
    const doc = await this.documentRepository.findById(id);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new NotFoundException('Documento no encontrado');
    }
    doc.status = body.status as any;
    if (body.payment_method) {
      doc.payment_method = body.payment_method;
    }
    return this.documentRepository.save(doc);
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
