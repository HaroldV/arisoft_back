import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { Sale } from '../../../../domain/entities/sale.entity';
import { GetCompanyProfileUseCase } from '../get-company-profile.use-case';
import { UpdateCompanyProfileUseCase } from '../update-company-profile.use-case';

describe('Company Profile Use Cases', () => {
  let getUseCase: GetCompanyProfileUseCase;
  let updateUseCase: UpdateCompanyProfileUseCase;
  let mockTenantRepo: jest.Mocked<Repository<Tenant>>;
  let mockSaleRepo: jest.Mocked<Repository<Sale>>;

  const tenantId = 'tenant-uuid-123';

  beforeEach(async () => {
    mockTenantRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (data) => data),
    } as any;

    mockSaleRepo = {
      count: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCompanyProfileUseCase,
        UpdateCompanyProfileUseCase,
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: getRepositoryToken(Sale), useValue: mockSaleRepo },
      ],
    }).compile();

    getUseCase = module.get<GetCompanyProfileUseCase>(GetCompanyProfileUseCase);
    updateUseCase = module.get<UpdateCompanyProfileUseCase>(UpdateCompanyProfileUseCase);
  });

  describe('GetCompanyProfileUseCase', () => {
    it('should return profile with hasIssuedInvoices false if no sales exist', async () => {
      const mockTenant = new Tenant({
        id: tenantId,
        company_name: 'Legal Corp',
        tax_id: 'J-12345678-9',
        plan_type: 'TRIAL_90',
        trial_expires_at: new Date(),
        settings: {},
        is_active: true,
        taxpayer_type: 'ORDINARY',
        is_withholding_agent: false,
      });

      mockTenantRepo.findOne.mockResolvedValue(mockTenant);
      mockSaleRepo.count.mockResolvedValue(0);

      const result = await getUseCase.execute(tenantId);

      expect(mockTenantRepo.findOne).toHaveBeenCalledWith({ where: { id: tenantId } });
      expect(mockSaleRepo.count).toHaveBeenCalledWith({ where: { tenant_id: tenantId } });
      expect(result.company_name).toBe('Legal Corp');
      expect(result.hasIssuedInvoices).toBe(false);
    });

    it('should return hasIssuedInvoices true if sales count > 0', async () => {
      const mockTenant = new Tenant({ id: tenantId, taxpayer_type: 'SPECIAL' });
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);
      mockSaleRepo.count.mockResolvedValue(5);

      const result = await getUseCase.execute(tenantId);
      expect(result.hasIssuedInvoices).toBe(true);
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      mockTenantRepo.findOne.mockResolvedValue(null);
      await expect(getUseCase.execute(tenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('UpdateCompanyProfileUseCase', () => {
    it('should allow OWNER to update legal and operational fields', async () => {
      const existingTenant = new Tenant({
        id: tenantId,
        company_name: 'Old Name',
        tax_id: 'J-11111111-1',
        commercial_name: 'Old Comm',
      });

      mockTenantRepo.findOne.mockResolvedValue(existingTenant);
      mockSaleRepo.count.mockResolvedValue(0);

      const dto = {
        company_name: 'New Legal Name',
        tax_id: 'J-22222222-2',
        commercial_name: 'New Comm Name',
        phone: '0412-5555555',
      };

      const result = await updateUseCase.execute(tenantId, 'OWNER', dto);

      expect(existingTenant.company_name).toBe('New Legal Name');
      expect(existingTenant.tax_id).toBe('J-22222222-2');
      expect(existingTenant.commercial_name).toBe('New Comm Name');
      expect(existingTenant.phone).toBe('0412-5555555');
      expect(mockTenantRepo.save).toHaveBeenCalledWith(existingTenant);
      expect(result.tenantId).toBe(tenantId);
    });

    it('should allow MANAGER to edit only operational fields', async () => {
      const existingTenant = new Tenant({
        id: tenantId,
        company_name: 'Old Legal',
        tax_id: 'J-11111111-1',
        commercial_name: 'Old Comm',
      });

      mockTenantRepo.findOne.mockResolvedValue(existingTenant);

      const dto = {
        commercial_name: 'New Operational Name',
        phone: '0212-9999999',
      };

      await updateUseCase.execute(tenantId, 'MANAGER', dto);

      expect(existingTenant.company_name).toBe('Old Legal'); // remains same
      expect(existingTenant.commercial_name).toBe('New Operational Name');
      expect(mockTenantRepo.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if MANAGER tries to edit legal fields', async () => {
      const existingTenant = new Tenant({
        id: tenantId,
        company_name: 'Old Legal',
        tax_id: 'J-11111111-1',
      });

      mockTenantRepo.findOne.mockResolvedValue(existingTenant);

      const dto = {
        company_name: 'Hack Name',
      };

      await expect(updateUseCase.execute(tenantId, 'MANAGER', dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if OWNER tries to edit RIF/Name once sales exist', async () => {
      const existingTenant = new Tenant({
        id: tenantId,
        company_name: 'Original Name',
        tax_id: 'J-11111111-1',
      });

      mockTenantRepo.findOne.mockResolvedValue(existingTenant);
      mockSaleRepo.count.mockResolvedValue(1); // Sale exists

      const dto = {
        company_name: 'Changed Legal Name',
      };

      await expect(updateUseCase.execute(tenantId, 'OWNER', dto)).rejects.toThrow(BadRequestException);
    });
  });
});
