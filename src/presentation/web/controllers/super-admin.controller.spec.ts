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
});
