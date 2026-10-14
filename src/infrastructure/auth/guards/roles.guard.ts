import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../domain/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../domain/constants/domain.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.FORBIDDEN_RESOURCE);
    }

    return true;
  }
}
