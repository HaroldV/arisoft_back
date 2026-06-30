import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULES_KEY, AppModule } from '../decorators/modules.decorator';

@Injectable()
export class ModulesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModules = this.reflector.getAllAndOverride<AppModule[]>(MODULES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModules || requiredModules.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.enabled_modules) {
      throw new ForbiddenException('No module access information found in session');
    }

    const hasAccess = requiredModules.every((module) => 
      user.enabled_modules.includes(module)
    );

    if (!hasAccess) {
      throw new ForbiddenException(`Your tenant plan does not include access to: ${requiredModules.join(', ')}`);
    }

    return true;
  }
}
