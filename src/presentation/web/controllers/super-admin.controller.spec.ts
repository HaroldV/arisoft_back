import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SaasPlan } from '../../../domain/entities/saas-plan.entity';
import { DataSource } from 'typeorm';
import { AuthService } from '../../../application/use-cases/auth/auth.service';
import { ExchangeRateService } from '../../../infrastructure/finance/exchange-rate.service';
import { SaasPlanManagementUseCase } from '../../../application/use-cases/admin/saas-plan-management.use-case';
import { ApproveSubscriptionPaymentUseCase } from '../../../application/use-cases/admin/approve-subscription-payment.use-case';

import { ExchangeRateHistoryRepository } from '../../../infrastructure/persistence/typeorm/repositories/exchange-rate-history.repository';

describe('SuperAdminController - SaaS Plans CRUD (Unit & Integration Tests)', () => {
  let controller: SuperAdminController;
  let mockPlanRepository: any;
  let mockDataSource: any;
  let mockAuthService: any;
  let mockExchangeRateService: any;

  const samplePayload = {
    name: 'Plan Emprendedor',
    code: 'PLAN_EMPRENDEDOR',
    description: 'Ideal para pequeños negocios que inician su digitalización.',
    monthly_fee_usd: 15,
    annual_fee_usd: 150,
    max_users: 2,
    max_products: 500,
    max_warehouses: 1,
    has_fiscal_printing: false,
    badge_text: '',
    is_featured: false,
    is_active: true,
    enabled_modules: ['POS', 'INVENTORY'],
    enabled_permissions: ['pos:create', 'sales:invoicing', 'inventory:stock'],
    features_list: [
      'Punto de Venta (POS) y Caja Rápida: Emisión de notas de entrega y facturas de venta rápida.',
      'Control de Inventario Básico: Registro de catálogo de hasta 500 productos y alerta de bajo stock.',
      'Cuentas por Cobrar y Pagar: Registro de clientes, proveedores y saldos pendientes.',
      'Reportes Esenciales: Resumen diario de ventas, ganancias del día y flujo de caja en Bs./$.',
      'Multimoneda Base: Conversión automática a Tasa Oficial BCV.'
    ]
  };

  beforeEach(async () => {
    mockPlanRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === SaasPlan) return mockPlanRepository;
        return {};
      }),
    };

    mockAuthService = {};
    mockExchangeRateService = {};
    const mockExchangeRateHistoryRepository = {
      findRecent: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
        { provide: ExchangeRateHistoryRepository, useValue: mockExchangeRateHistoryRepository },
        { provide: SaasPlanManagementUseCase, useClass: SaasPlanManagementUseCase },
        { provide: ApproveSubscriptionPaymentUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<SuperAdminController>(SuperAdminController);
  });

  describe('POST /admin/plans (createPlan)', () => {
    it('1. Debe lanzar BadRequestException si falta el nombre o el código', async () => {
      await expect(controller.createPlan({ name: 'Incompleto' })).rejects.toThrow(BadRequestException);
      await expect(controller.createPlan({ code: 'SIN_NOMBRE' })).rejects.toThrow(BadRequestException);
    });

    it('2. Debe lanzar ConflictException si ya existe un plan con el mismo código', async () => {
      mockPlanRepository.findOne.mockResolvedValue(new SaasPlan({ id: 'uuid-1', code: 'PLAN_EMPRENDEDOR' }));

      await expect(controller.createPlan(samplePayload)).rejects.toThrow(ConflictException);
      expect(mockPlanRepository.findOne).toHaveBeenCalledWith({ where: { code: 'PLAN_EMPRENDEDOR' } });
    });

    it('3. Debe crear y retornar exitosamente el Plan SaaS cuando el payload del usuario es válido (HAPPY PATH)', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);
      mockPlanRepository.save.mockImplementation(async (plan: SaasPlan) => {
        return { id: 'generated-uuid-1234', ...plan };
      });

      const response = await controller.createPlan(samplePayload);

      expect(response).toBeDefined();
      expect(response.message).toBe('Plan SaaS registrado exitosamente');
      expect(response.plan).toBeDefined();
      expect(response.plan.id).toBe('generated-uuid-1234');
      expect(response.plan.code).toBe('PLAN_EMPRENDEDOR');
      expect(response.plan.name).toBe('Plan Emprendedor');
      expect(response.plan.monthly_fee_usd).toBe(15);
      expect(response.plan.annual_fee_usd).toBe(150);
      expect(response.plan.max_users).toBe(2);
      expect(response.plan.max_products).toBe(500);
      expect(response.plan.features_list.length).toBe(5);

      expect(mockPlanRepository.save).toHaveBeenCalled();
    });
  });

  describe('PUT /admin/plans/:id (updatePlan)', () => {
    it('Debe actualizar un plan existente correctamente', async () => {
      const existingPlan = new SaasPlan({
        id: 'plan-123',
        code: 'PLAN_EMPRENDEDOR',
        name: 'Plan Nombre Viejo',
        monthly_fee_usd: 10
      });
      mockPlanRepository.findOne.mockResolvedValue(existingPlan);
      mockPlanRepository.save.mockImplementation(async (plan: SaasPlan) => plan);

      const updateResult = await controller.updatePlan('plan-123', { name: 'Plan Emprendedor Pro', monthly_fee_usd: 20 });
      expect(updateResult.plan.name).toBe('Plan Emprendedor Pro');
      expect(updateResult.plan.monthly_fee_usd).toBe(20);
    });

    it('Debe lanzar NotFoundException si el id no existe', async () => {
      mockPlanRepository.findOne.mockResolvedValue(null);
      await expect(controller.updatePlan('inexistente', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET & POST /admin/bcv (Dual Master Rate Management)', () => {
    it('Debe consultar la matriz de tasas maestras vigente (USD y EUR)', async () => {
      mockExchangeRateService.getCurrentMasterRate = jest.fn().mockResolvedValue({
        USD: { rate: 772.54, code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
        EUR: { rate: 894.49, code: 'EUR', symbol: '€', name: 'Euro' },
        source: 'SAVED_STATE',
        updated_at: '2026-08-17T12:00:00Z',
      });

      const result = await controller.getMasterBcvRate();
      expect(result.USD.rate).toBe(772.54);
      expect(result.EUR.rate).toBe(894.49);
      expect(result.source).toBe('SAVED_STATE');
    });

    it('Debe sincronizar las tasas oficiales vía scraping dual', async () => {
      mockExchangeRateService.getOfficialBcvRate = jest.fn().mockResolvedValue({
        USD: { rate: 772.5441, code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
        EUR: { rate: 894.4902, code: 'EUR', symbol: '€', name: 'Euro' },
        source: 'AUTO_SCRAPING',
        updated_at: '2026-08-17T12:00:00Z',
        value_date: '17/08/2026',
        execution_slot: 'MORNING',
      });

      const res = await controller.syncBcvRate();
      expect(res.USD.rate).toBe(772.5441);
      expect(res.EUR.rate).toBe(894.4902);
      expect(res.source).toBe('AUTO_SCRAPING');
      expect(res.message).toContain('USD');
      expect(res.message).toContain('EUR');
    });

    it('Debe registrar manualmente las tasas y lanzar error si son inválidas', async () => {
      await expect(controller.setManualBcvRate({ usd_rate: -5 })).rejects.toThrow(BadRequestException);
      await expect(controller.setManualBcvRate({ eur_rate: -10 })).rejects.toThrow(BadRequestException);

      mockExchangeRateService.setManualMasterRate = jest.fn().mockResolvedValue({
        USD: { rate: 775.50, code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
        EUR: { rate: 898.00, code: 'EUR', symbol: '€', name: 'Euro' },
        source: 'MANUAL',
        updated_at: '2026-08-17T12:05:00Z',
      });

      const res = await controller.setManualBcvRate({ usd_rate: 775.50, eur_rate: 898.00, note: 'Ajuste manual' });
      expect(res.USD.rate).toBe(775.50);
      expect(res.EUR.rate).toBe(898.00);
      expect(res.source).toBe('MANUAL');
    });
  });

  describe('PUT /admin/tenants/:id (updateTenant reset password flow)', () => {
    it('Debe regenerar la clave temporal y marcar is_temporary_password = true cuando reset_password es true', async () => {
      const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockTenant = {
        id: validUuid,
        company_name: 'Demo Company',
        tax_id: 'J-12345678-9',
        plan_type: 'EMPRENDEDOR',
        is_active: true,
        trial_expires_at: new Date('2026-12-31'),
        settings: {
          subdomain: 'demo-co',
          max_users: 2,
          max_products: 500,
          monthly_fee_usd: 15,
          owner_email: 'demo@arivsoft.com',
          owner_name: 'Usuario Demo',
          enabled_modules: ['POS'],
          enabled_permissions: ['pos:create']
        }
      };

      const mockOwnerUser = {
        id: 'user-demo-456',
        tenant_id: validUuid,
        email: 'demo@arivsoft.com',
        full_name: 'Usuario Demo',
        password_hash: 'old_hash',
        is_temporary_password: false,
        is_active: true,
        failed_login_attempts: 0
      };

      const mockTenantRepo = {
        findOne: jest.fn().mockResolvedValue(mockTenant),
        save: jest.fn().mockImplementation(async (t) => t)
      };

      const mockUserRepo = {
        findOne: jest.fn().mockResolvedValue(mockOwnerUser),
        save: jest.fn().mockImplementation(async (u) => u)
      };

      mockDataSource.getRepository = jest.fn().mockImplementation((entity) => {
        if (entity.name === 'Tenant') return mockTenantRepo;
        if (entity.name === 'User') return mockUserRepo;
        return mockPlanRepository;
      });

      mockAuthService.hashPassword = jest.fn().mockResolvedValue('hashed_ArivPassword123!');

      const result = await controller.updateTenant(validUuid, {
        name: 'Demo Company Updated',
        owner_email: 'demo@arivsoft.com',
        reset_password: true
      });

      expect(result.message).toBe('Tenant subscription updated successfully');
      expect(result.defaultPassword).toBe('ArivPassword123!');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('ArivPassword123!');
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'demo@arivsoft.com',
          is_temporary_password: true,
          password_hash: 'hashed_ArivPassword123!'
        })
      );
      expect(mockTenantRepo.save).toHaveBeenCalled();
    });

    it('Debe persistir y modificar todos y cada uno de los inputs del modal Editar Empresa', async () => {
      const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockTenant = {
        id: validUuid,
        company_name: 'Distribuidora JP',
        tax_id: 'J-12345678-9',
        plan_type: 'EMPRENDEDOR',
        is_active: true,
        trial_expires_at: new Date('2026-12-31'),
        settings: {
          subdomain: 'distjp',
          max_users: 2,
          max_products: 500,
          monthly_fee_usd: 15,
          owner_email: 'juan@empresa.com',
          owner_name: 'Juan Pérez',
          enabled_modules: ['POS', 'INVENTORY'],
          enabled_permissions: ['pos:create', 'inventory:stock']
        }
      };

      const mockOwnerUser = {
        id: 'user-jp-123',
        tenant_id: validUuid,
        email: 'juan@empresa.com',
        full_name: 'Juan Pérez',
        password_hash: 'hash123',
        is_temporary_password: false,
        is_active: true,
        failed_login_attempts: 0
      };

      let savedTenantState: any = null;
      let savedUserState: any = null;

      const mockTenantRepo = {
        findOne: jest.fn().mockResolvedValue(mockTenant),
        save: jest.fn().mockImplementation(async (t) => {
          savedTenantState = { ...t };
          return savedTenantState;
        })
      };

      const mockUserRepo = {
        findOne: jest.fn().mockResolvedValue(mockOwnerUser),
        save: jest.fn().mockImplementation(async (u) => {
          savedUserState = { ...u };
          return savedUserState;
        })
      };

      mockDataSource.getRepository = jest.fn().mockImplementation((entity) => {
        if (entity.name === 'Tenant') return mockTenantRepo;
        if (entity.name === 'User') return mockUserRepo;
        return mockPlanRepository;
      });

      const fullEditPayload = {
        name: 'Inversiones JP C.A. Modificada',
        tax_id: 'J-98765432-1',
        subdomain: 'inversionesjp',
        plan_name: 'CORPORATIVO',
        status: 'SUSPENDED',
        max_users: 25,
        max_products: 10000,
        monthly_fee_usd: 60.00,
        owner_email: 'nuevoowner@empresa.com',
        owner_name: 'Carlos Rodríguez',
        enabled_modules: ['POS', 'SALES', 'INVENTORY', 'BANKS', 'REPORTS', 'PAYROLL', 'SETTINGS'],
        enabled_permissions: ['pos:create', 'sales:invoicing', 'inventory:create', 'banks:accounts', 'reports:view', 'payroll:manage', 'company:manage'],
        reset_password: false
      };

      const result = await controller.updateTenant(validUuid, fullEditPayload);

      expect(result.message).toBe('Tenant subscription updated successfully');
      expect(mockTenantRepo.save).toHaveBeenCalledTimes(1);
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);

      // Verificación exhaustiva de cada campo persistido en el Tenant:
      expect(savedTenantState.company_name).toBe('Inversiones JP C.A. Modificada');
      expect(savedTenantState.tax_id).toBe('J-98765432-1');
      expect(savedTenantState.plan_type).toBe('CORPORATIVO');
      expect(savedTenantState.is_active).toBe(false); // SUSPENDED
      expect(savedTenantState.settings.subdomain).toBe('inversionesjp');
      expect(savedTenantState.settings.max_users).toBe(25);
      expect(savedTenantState.settings.max_products).toBe(10000);
      expect(savedTenantState.settings.monthly_fee_usd).toBe(60.00);
      expect(savedTenantState.settings.owner_email).toBe('nuevoowner@empresa.com');
      expect(savedTenantState.settings.owner_name).toBe('Carlos Rodríguez');
      expect(savedTenantState.settings.enabled_modules).toEqual(['POS', 'SALES', 'INVENTORY', 'BANKS', 'REPORTS', 'PAYROLL', 'SETTINGS']);
      expect(savedTenantState.settings.enabled_permissions).toEqual(['pos:create', 'sales:invoicing', 'inventory:create', 'banks:accounts', 'reports:view', 'payroll:manage', 'company:manage']);

      // Verificación exhaustiva de sincronización en el Usuario Owner:
      expect(savedUserState.email).toBe('nuevoowner@empresa.com');
      expect(savedUserState.full_name).toBe('Carlos Rodríguez');
      expect(savedUserState.is_active).toBe(false); // Sincronizado con estado SUSPENDED
      expect(savedUserState.allowed_permissions).toEqual(['pos:create', 'sales:invoicing', 'inventory:create', 'banks:accounts', 'reports:view', 'payroll:manage', 'company:manage']);
    });
  });
});
