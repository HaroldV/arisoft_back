import { PLAN_DEFAULT_MODULES, PLAN_DEFAULT_PERMISSIONS, SaasPlanEnum, SystemModuleEnum } from '../../../domain/constants/domain.constants';

describe('SaaS Plan Access Matrix & Permission Visibility Rules', () => {
  describe('Plan EMPRENDEDOR ($25.00/mes)', () => {
    const modules = PLAN_DEFAULT_MODULES[SaasPlanEnum.EMPRENDEDOR];
    const permissions = PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.EMPRENDEDOR];

    it('Debe incluir exactamente los 5 módulos base de Emprendedor', () => {
      expect(modules).toContain(SystemModuleEnum.POS);
      expect(modules).toContain(SystemModuleEnum.INVENTORY_PURCHASES);
      expect(modules).toContain(SystemModuleEnum.INVENTORY);
      expect(modules).toContain(SystemModuleEnum.BANKS);
      expect(modules).toContain(SystemModuleEnum.SETTINGS);
      expect(modules).not.toContain(SystemModuleEnum.PAYROLL);
      expect(modules).not.toContain(SystemModuleEnum.REPORTS);
    });

    it('Debe permitir únicamente Cuentas Bancarias en el módulo Cuentas (NO CxC, CxP ni Historial)', () => {
      expect(permissions).toContain('banks:accounts');
      expect(permissions).not.toContain('accounts:receivables');
      expect(permissions).not.toContain('accounts:payables');
      expect(permissions).not.toContain('accounts:history');
    });

    it('Debe permitir compra directa pero NO órdenes de compra ni notas de recepción', () => {
      expect(permissions).toContain('purchases:new');
      expect(permissions).toContain('purchases:invoices');
      expect(permissions).toContain('providers:manage');
      expect(permissions).not.toContain('purchases:orders');
      expect(permissions).not.toContain('purchases:receptions');
    });

    it('Debe restringir preventa y analítica en ventas', () => {
      expect(permissions).toContain('pos:create');
      expect(permissions).toContain('sales:invoicing');
      expect(permissions).toContain('clients:manage');
      expect(permissions).not.toContain('sales:quotations');
      expect(permissions).not.toContain('sales:orders');
      expect(permissions).not.toContain('sales:deliveries');
      expect(permissions).not.toContain('pos:shifts');
    });
  });

  describe('Plan COMERCIAL_PRO ($50.00/mes)', () => {
    const modules = PLAN_DEFAULT_MODULES[SaasPlanEnum.COMERCIAL_PRO];
    const permissions = PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.COMERCIAL_PRO];

    it('Debe incluir Reportes y Finanzas completas pero NO Nómina', () => {
      expect(modules).toContain(SystemModuleEnum.REPORTS);
      expect(modules).toContain(SystemModuleEnum.BANKS);
      expect(modules).not.toContain(SystemModuleEnum.PAYROLL);
    });

    it('Debe exigir circuito formal de compras (Órdenes y Recepciones) y EXCLUIR compra directa', () => {
      expect(permissions).toContain('purchases:orders');
      expect(permissions).toContain('purchases:receptions');
      expect(permissions).toContain('purchases:invoices');
      expect(permissions).not.toContain('purchases:new');
    });

    it('Debe incluir todas las subsecciones de Cuentas (Bancos, CxC, CxP, Historial)', () => {
      expect(permissions).toContain('banks:accounts');
      expect(permissions).toContain('accounts:receivables');
      expect(permissions).toContain('accounts:payables');
      expect(permissions).toContain('accounts:history');
    });

    it('Debe incluir preventa completa y turnos de caja', () => {
      expect(permissions).toContain('sales:quotations');
      expect(permissions).toContain('sales:orders');
      expect(permissions).toContain('sales:deliveries');
      expect(permissions).toContain('pos:shifts');
    });
  });

  describe('Plan CORPORATIVO ($120.00/mes)', () => {
    const modules = PLAN_DEFAULT_MODULES[SaasPlanEnum.CORPORATIVO];
    const permissions = PLAN_DEFAULT_PERMISSIONS[SaasPlanEnum.CORPORATIVO];

    it('Debe incluir el 100% de los módulos del sistema (incluyendo Nómina)', () => {
      expect(modules).toContain(SystemModuleEnum.PAYROLL);
      expect(modules).toContain(SystemModuleEnum.REPORTS);
      expect(modules).toContain(SystemModuleEnum.BANKS);
      expect(modules).toContain(SystemModuleEnum.INVENTORY_PURCHASES);
      expect(permissions).toContain('payroll:manage');
    });

    it('Debe excluir compra directa y requerir circuito formal de compras', () => {
      expect(permissions).toContain('purchases:orders');
      expect(permissions).toContain('purchases:receptions');
      expect(permissions).toContain('purchases:invoices');
      expect(permissions).not.toContain('purchases:new');
    });
  });
});
