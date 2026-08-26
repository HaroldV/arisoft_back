import { 
  PLAN_DEFAULT_MODULES, 
  PLAN_DEFAULT_PERMISSIONS, 
  SaasPlanEnum, 
  BACKEND_SYSTEM_CONSTANTS 
} from '../../../domain/constants/domain.constants';

describe('Tenant Registration & Edit Modal Plan Synchronization Specs', () => {
  it('Al seleccionar EMPRENDEDOR debe sincronizar exactamente $25/mes, 2 usuarios, 500 productos y sus 12 permisos base', () => {
    const limits = BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS[SaasPlanEnum.EMPRENDEDOR];
    const permissions = PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.EMPRENDEDOR];
    const modules = PLAN_DEFAULT_MODULES[SaasPlanEnum.EMPRENDEDOR];

    expect(limits.FEE_USD).toBe(25);
    expect(limits.USERS).toBe(2);
    expect(limits.PRODUCTS).toBe(500);

    // Permisos Emprendedor: solo bancos (NO CxC, CxP, Historial), solo compra directa (NO órdenes)
    expect(permissions).toContain('pos:create');
    expect(permissions).toContain('sales:invoicing');
    expect(permissions).toContain('clients:manage');
    expect(permissions).toContain('purchases:new');
    expect(permissions).toContain('banks:accounts');
    expect(permissions).not.toContain('accounts:receivables');
    expect(permissions).not.toContain('accounts:payables');
    expect(permissions).not.toContain('accounts:history');
    expect(permissions).not.toContain('purchases:orders');
    expect(permissions).not.toContain('reports:view');
    expect(permissions).not.toContain('payroll:manage');

    expect(modules.length).toBe(5);
  });

  it('Al seleccionar COMERCIAL_PRO debe sincronizar exactamente $50/mes, 5 usuarios, 5000 productos y permisos formales', () => {
    const limits = BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS[SaasPlanEnum.COMERCIAL_PRO];
    const permissions = PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.COMERCIAL_PRO];

    expect(limits.FEE_USD).toBe(50);
    expect(limits.USERS).toBe(5);
    expect(limits.PRODUCTS).toBe(5000);

    expect(permissions).toContain('purchases:orders');
    expect(permissions).toContain('purchases:receptions');
    expect(permissions).not.toContain('purchases:new');
    expect(permissions).toContain('accounts:receivables');
    expect(permissions).toContain('accounts:payables');
    expect(permissions).toContain('accounts:history');
    expect(permissions).toContain('reports:view');
    expect(permissions).not.toContain('payroll:manage');
  });

  it('Al seleccionar CORPORATIVO debe sincronizar exactamente $120/mes, 50 usuarios, 999999 productos y nómina incluida', () => {
    const limits = BACKEND_SYSTEM_CONSTANTS.PLAN_LIMITS[SaasPlanEnum.CORPORATIVO];
    const permissions = PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.CORPORATIVO];

    expect(limits.FEE_USD).toBe(120);
    expect(limits.USERS).toBe(50);
    expect(limits.PRODUCTS).toBe(999999);

    expect(permissions).toContain('payroll:manage');
    expect(permissions).toContain('reports:view');
    expect(permissions).toContain('purchases:orders');
    expect(permissions).not.toContain('purchases:new');
  });
});
