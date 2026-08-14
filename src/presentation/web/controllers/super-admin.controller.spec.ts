import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SaasPlan } from '../../../domain/entities/saas-plan.entity';
import { DataSource } from 'typeorm';
import { AuthService } from '../../../application/use-cases/auth/auth.service';
import { ExchangeRateService } from '../../../infrastructure/finance/exchange-rate.service';
import { SaasPlanManagementUseCase } from '../../../application/use-cases/admin/saas-plan-management.use-case';
import { ApproveSubscriptionPaymentUseCase } from '../../../application/use-cases/admin/approve-subscription-payment.use-case';

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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
        SaasPlanManagementUseCase,
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

  describe('PUT /admin/plans/:id/status (togglePlanStatus)', () => {
    it('Debe alternar el estado activo/inactivo de un plan', async () => {
      const plan = new SaasPlan({ id: 'plan-123', is_active: true });
      mockPlanRepository.findOne.mockResolvedValue(plan);
      mockPlanRepository.save.mockImplementation(async (p: SaasPlan) => p);

      const res = await controller.togglePlanStatus('plan-123', { is_active: false });
      expect(res.plan.is_active).toBe(false);
    });
  });
});
