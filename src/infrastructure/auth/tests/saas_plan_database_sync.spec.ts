import { SaasPlanManagementUseCase } from '../../../application/use-cases/admin/saas-plan-management.use-case';
import { SaasPlanEnum } from '../../../domain/constants/domain.constants';
import { SaasPlan } from '../../../domain/entities/saas-plan.entity';

describe('SaaS Plans Database Synchronizer & Pricing Spec', () => {
  let useCase: SaasPlanManagementUseCase;
  let mockRepository: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockRepository = {
      find: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };
    useCase = new SaasPlanManagementUseCase(mockDataSource);
  });

  it('debe actualizar en BD planes existentes con tarifas anteriores a los nuevos precios ($25, $50, $120)', async () => {
    // Simulamos que la BD tenía planes con tarifas viejas de $35, $75, etc.
    const oldDbPlans = [
      new SaasPlan({
        id: 'p-1',
        code: 'EMPRENDEDOR',
        name: 'Emprendedor',
        monthly_fee_usd: 35.00,
        max_users: 10,
        max_products: 2500,
      }),
      new SaasPlan({
        id: 'p-2',
        code: 'COMERCIAL_PRO',
        name: 'Comercial Pro',
        monthly_fee_usd: 75.00,
        max_users: 25,
        max_products: 10000,
      }),
    ];

    mockRepository.find.mockResolvedValueOnce(oldDbPlans).mockResolvedValueOnce([
      { code: 'EMPRENDEDOR', monthly_fee_usd: 25, max_users: 2, max_products: 500 },
      { code: 'COMERCIAL_PRO', monthly_fee_usd: 50, max_users: 5, max_products: 5000 },
      { code: 'CORPORATIVO', monthly_fee_usd: 120, max_users: 50, max_products: 999999 },
    ]);

    mockRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

    const result = await useCase.listPlans();

    expect(mockRepository.save).toHaveBeenCalled();
    // Verifica que el plan Emprendedor se corrigió a $25 y 2 usuarios
    expect(oldDbPlans[0].monthly_fee_usd).toBe(25.00);
    expect(oldDbPlans[0].max_users).toBe(2);
    expect(oldDbPlans[0].max_products).toBe(500);

    // Verifica que Comercial Pro se corrigió a $50 y 5 usuarios
    expect(oldDbPlans[1].monthly_fee_usd).toBe(50.00);
    expect(oldDbPlans[1].max_users).toBe(5);
    expect(oldDbPlans[1].max_products).toBe(5000);

    expect(result.length).toBe(3);
  });
});
