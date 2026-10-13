import { Controller, Post, Body, Get, Put, Delete, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';
import { CreateRoleUseCase } from '../../../application/use-cases/role/create-role.use-case';
import { ListRolesUseCase } from '../../../application/use-cases/role/list-roles.use-case';
import { UpdateRoleUseCase } from '../../../application/use-cases/role/update-role.use-case';
import { DeleteRoleUseCase } from '../../../application/use-cases/role/delete-role.use-case';
import { CreateRoleDto } from '../../../application/use-cases/role/dto/create-role.dto';
import { UpdateRoleDto } from '../../../application/use-cases/role/dto/update-role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
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

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('users:manage')
  @ApiOperation({ summary: 'Actualizar un rol personalizado existente' })
  async updateRole(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const editor = req.user;
    return this.updateRoleUseCase.execute(
      editor.tenant_id,
      id,
      {
        role: editor.role,
        permissions: editor.permissions || [],
      },
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('users:manage')
  @ApiOperation({ summary: 'Eliminar un rol personalizado que no esté en uso' })
  async deleteRole(@Req() req: any, @Param('id') id: string) {
    const requester = req.user;
    return this.deleteRoleUseCase.execute(requester.tenant_id, id);
  }
}
