import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULES_KEY, ANY_MODULES_KEY, AppModule } from '../decorators/modules.decorator';
import { UserRole } from '../../../domain/entities/user.entity';
import { BACKEND_SYSTEM_CONSTANTS } from '../../../domain/constants/domain.constants';

@Injectable()
export class ModulesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModules = this.reflector.getAllAndOverride<AppModule[]>(MODULES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const anyModules = this.reflector.getAllAndOverride<AppModule[]>(ANY_MODULES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if ((!requiredModules || requiredModules.length === 0) && (!anyModules || anyModules.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.NO_SESSION_FOUND);
    }

    // Owner and SuperAdmin have absolute module access
    if (user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (!user.enabled_modules || !Array.isArray(user.enabled_modules)) {
      throw new ForbiddenException(BACKEND_SYSTEM_CONSTANTS.MESSAGES.FORBIDDEN_RESOURCE);
    }

    if (requiredModules && requiredModules.length > 0) {
      const hasAccess = requiredModules.every((module) => 
        user.enabled_modules.includes(module)
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          BACKEND_SYSTEM_CONSTANTS.MESSAGES.FORBIDDEN_MODULE(requiredModules.join(', ')),
        );
      }
    }

    if (anyModules && anyModules.length > 0) {
      const hasAnyAccess = anyModules.some((module) => 
        user.enabled_modules.includes(module)
      );
      if (!hasAnyAccess) {
        throw new ForbiddenException(
          BACKEND_SYSTEM_CONSTANTS.MESSAGES.FORBIDDEN_MODULE_ANY(anyModules.join(', ')),
        );
      }
    }

    return true;
  }
}

