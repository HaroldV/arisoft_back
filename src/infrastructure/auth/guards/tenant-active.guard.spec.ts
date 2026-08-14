import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantActiveGuard } from './tenant-active.guard';
import { TenantStatusEnum } from '../../../domain/constants/domain.constants';

describe('TenantActiveGuard (TDD First)', () => {
  let guard: TenantActiveGuard;

  beforeEach(() => {
    guard = new TenantActiveGuard();
  });

  const createMockContext = (url: string, tenantStatus: string, isSuperAdmin = false): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          url,
          user: {
            is_super_admin: isSuperAdmin,
            tenant_status: tenantStatus,
          },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if tenant is ACTIVE', () => {
    const context = createMockContext('/api/v1/pos/sales', TenantStatusEnum.ACTIVE);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access to subscription and auth endpoints even if tenant is SUSPENDED', () => {
    const context1 = createMockContext('/api/v1/subscription/plans', TenantStatusEnum.SUSPENDED);
    const context2 = createMockContext('/api/v1/auth/me', TenantStatusEnum.SUSPENDED);

    expect(guard.canActivate(context1)).toBe(true);
    expect(guard.canActivate(context2)).toBe(true);
  });

  it('should allow superadmin full access regardless of tenant status', () => {
    const context = createMockContext('/api/v1/pos/sales', TenantStatusEnum.SUSPENDED, true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should block business modules (POS, Inventory, Sales) if tenant is SUSPENDED or TRIAL expired', () => {
    const context = createMockContext('/api/v1/pos/sales', TenantStatusEnum.SUSPENDED);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
