import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { TenantStatusEnum } from '../../../domain/constants/domain.constants';

@Injectable()
export class TenantActiveGuard implements CanActivate {
  private readonly ALLOWED_SUSPENDED_PATHS = [
    '/subscription',
    '/auth',
    '/admin/backoffice',
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SuperAdmin supercedes tenant restrictions
    if (user?.is_super_admin) {
      return true;
    }

    const url = request.url || '';
    const isAllowedPath = this.ALLOWED_SUSPENDED_PATHS.some((path) => url.includes(path));

    if (isAllowedPath) {
      return true;
    }

    const tenantStatus = user?.tenant_status || TenantStatusEnum.SUSPENDED;

    if (tenantStatus !== TenantStatusEnum.ACTIVE) {
      throw new ForbiddenException(
        'La suscripción de la empresa se encuentra suspendida o requiere adquirir un plan activo para operar.'
      );
    }

    return true;
  }
}
