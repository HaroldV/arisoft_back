import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../../../domain/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('No user session found');
    }

    // Owner role has absolute permissions, skip validation
    if (user.role === UserRole.OWNER) {
      return true;
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      throw new ForbiddenException('No granular permissions found in session');
    }

    const hasAccess = requiredPermissions.every((perm) => 
      user.permissions.includes(perm)
    );

    if (!hasAccess) {
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
