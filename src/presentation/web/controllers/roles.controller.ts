import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';
import { CreateRoleUseCase } from '../../../application/use-cases/role/create-role.use-case';
import { ListRolesUseCase } from '../../../application/use-cases/role/list-roles.use-case';
import { CreateRoleDto } from '../../../application/use-cases/role/dto/create-role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermissions('users:manage')
  @ApiOperation({ summary: 'Registrar un nuevo rol personalizado con permisos granulares' })
  async createRole(@Req() req: any, @Body() dto: CreateRoleDto) {
    const creator = req.user;
    return this.createRoleUseCase.execute(
      creator.tenant_id,
      {
        role: creator.role,
        permissions: creator.permissions || [],
      },
      dto,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('users:manage')
  @ApiOperation({ summary: 'Obtener todos los roles del inquilino (sistema y personalizados)' })
  async listRoles(@Req() req: any) {
    const requester = req.user;
    return this.listRolesUseCase.execute(requester.tenant_id);
  }
}
