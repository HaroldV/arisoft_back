import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * TenantInterceptor
 * Purpose: Automatically extract tenant_id from JWT and inject it into the request context.
 * Standard: Row Level Isolation Guard (ST-1.1)
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenant_id) {
      throw new UnauthorizedException('Tenant ID not found in session context');
    }

    // Inject tenant_id into request for easy access in services/repositories
    request.tenant_id = user.tenant_id;

    return next.handle();
  }
}
