import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../../../domain/entities/user.entity';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../domain/constants/domain.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const anyPermissions = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if ((!requiredPermissions || requiredPermissions.length === 0) && (!anyPermissions || anyPermissions.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.NO_SESSION_FOUND);
    }

    // Owner and Super Admin roles have absolute permissions, skip validation
    if (user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      throw new ForbiddenException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.FORBIDDEN_RESOURCE);
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAccess = requiredPermissions.every((perm) => 
        user.permissions.includes(perm)
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          BACKEND_SYSTEM_CONSTANTS.MESSAGES.INSUFFICIENT_PERMISSIONS(requiredPermissions.join(', ')),
        );
      }
    }

    if (anyPermissions && anyPermissions.length > 0) {
      const hasAnyAccess = anyPermissions.some((perm) => 
        user.permissions.includes(perm)
      );
      if (!hasAnyAccess) {
        throw new ForbiddenException(
          BACKEND_SYSTEM_CONSTANTS.MESSAGES.INSUFFICIENT_PERMISSIONS_ANY(anyPermissions.join(', ')),
        );
      }
    }

    return true;
  }
}

