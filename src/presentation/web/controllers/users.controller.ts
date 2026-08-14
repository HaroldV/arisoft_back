import { Controller, Post, Body, Get, Put, Patch, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../infrastructure/auth/guards/permissions.guard';
import { RequiredPermissions } from '../../../infrastructure/auth/decorators/permissions.decorator';
import { CreateUserUseCase } from '../../../application/use-cases/user/create-user.use-case';
import { ListUsersUseCase } from '../../../application/use-cases/user/list-users.use-case';
import { UpdateUserUseCase } from '../../../application/use-cases/user/update-user.use-case';
import { CreateUserDto } from '../../../application/use-cases/user/dto/create-user.dto';
import { UpdateUserDto } from '../../../application/use-cases/user/dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermissions('users:manage')
  @ApiOperation({ summary: 'Registrar un nuevo usuario subordinado (OWNER/MANAGER únicamente)' })
  async createUser(@Req() req: any, @Body() dto: CreateUserDto) {
    const creator = req.user;
    return this.createUserUseCase.execute(
      {
        id: creator.userId,
        role: creator.role,
        tenant_id: creator.tenant_id,
        enabled_modules: creator.enabled_modules || [],
        permissions: creator.permissions || [],
      },
      dto,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('users:manage')
  @ApiOperation({ summary: 'Obtener la lista de usuarios visibles (equipo) según jerarquía' })
  async listUsers(@Req() req: any) {
    const requester = req.user;
    return this.listUsersUseCase.execute({
      id: requester.userId,
      role: requester.role,
      tenant_id: requester.tenant_id,
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('users:manage')
  @ApiOperation({ summary: 'Actualizar datos y permisos de un usuario' })
  async updateUser(
    @Req() req: any,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const updater = req.user;
    return this.updateUserUseCase.execute(
      {
        id: updater.userId,
        role: updater.role,
        tenant_id: updater.tenant_id,
        enabled_modules: updater.enabled_modules || [],
        permissions: updater.permissions || [],
      },
      targetUserId,
      dto,
    );
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('users:manage')
  @ApiOperation({ summary: 'Activar o desactivar la cuenta de un usuario' })
  async toggleUserStatus(
    @Req() req: any,
    @Param('id') targetUserId: string,
    @Body() body: { is_active: boolean; transfer_subordinates_to_id?: string },
  ) {
    const updater = req.user;
    return this.updateUserUseCase.execute(
      {
        id: updater.userId,
        role: updater.role,
        tenant_id: updater.tenant_id,
        enabled_modules: updater.enabled_modules || [],
        permissions: updater.permissions || [],
      },
      targetUserId,
      { 
        is_active: body.is_active, 
        transfer_subordinates_to_id: body.transfer_subordinates_to_id 
      },
    );
  }
}
