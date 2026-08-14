import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProviderRepository } from '../../../infrastructure/persistence/typeorm/repositories/provider.repository';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProvidersController (Unit & Integration Tests)', () => {
  let controller: ProvidersController;
  let mockProviderRepo: any;

  const validTenantId = '69430cba-f5b2-4cf2-b7e3-721394c1765c';
  const validProviderId = '69430cba-f5b2-4cf2-b7e3-721394c1765e';
  const mockReq = { user: { tenant_id: validTenantId } };

  beforeEach(async () => {
    mockProviderRepo = {
      findAll: jest.fn().mockResolvedValue([{ id: validProviderId, name: 'Proveedor Uno' }]),
      findAllByTenant: jest.fn().mockResolvedValue([{ id: validProviderId, name: 'Proveedor Uno' }]),
      findById: jest.fn().mockResolvedValue({ id: validProviderId, name: 'Proveedor Uno', tax_id: 'J-12345678-9' }),
      findByTaxId: jest.fn().mockResolvedValue(null),
      save: jest.fn((p) => Promise.resolve({ id: validProviderId, ...p })),
      softDelete: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        { provide: ProviderRepository, useValue: mockProviderRepo },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /providers', () => {
    it('should return provider list for tenant', async () => {
      const res = await controller.findAll(validTenantId, mockReq);
      expect(mockProviderRepo.findAll).toHaveBeenCalled();
      expect(res).toEqual([{ id: validProviderId, name: 'Proveedor Uno' }]);
    });

    it('should throw BadRequestException if tenantId is invalid', async () => {
      await expect(controller.findAll('invalid-uuid', mockReq)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if tenantId does not match session', async () => {
      const otherTenant = '69430cba-f5b2-4cf2-b7e3-721394c1765f';
      await expect(controller.findAll(otherTenant, mockReq)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /providers', () => {
    it('should create new provider if RIF is unique', async () => {
      const dto = { name: 'Nuevo Proveedor', tax_id: 'J-99999999-9', email: 'prov@test.com' };
      const res = await controller.create(validTenantId, dto as any, mockReq);
      expect(mockProviderRepo.save).toHaveBeenCalled();
      expect(res).toHaveProperty('name', 'Nuevo Proveedor');
    });

    it('should throw BadRequestException if RIF already exists', async () => {
      mockProviderRepo.findByTaxId.mockResolvedValueOnce({ id: 'existing-id', tax_id: 'J-99999999-9' });
      const dto = { name: 'Duplicado', tax_id: 'J-99999999-9' };
      await expect(controller.create(validTenantId, dto as any, mockReq)).rejects.toThrow(BadRequestException);
    });
  });

  describe('PUT /providers/:id', () => {
    it('should update provider fields', async () => {
      const dto = { name: 'Proveedor Modificado' };
      const res = await controller.update(validProviderId, validTenantId, dto, mockReq);
      expect(mockProviderRepo.save).toHaveBeenCalled();
      expect(res).toHaveProperty('name', 'Proveedor Modificado');
    });
  });

  describe('DELETE /providers/:id', () => {
    it('should soft delete provider', async () => {
      const res = await controller.remove(validProviderId, validTenantId, mockReq);
      expect(mockProviderRepo.softDelete).toHaveBeenCalledWith(validProviderId);
      expect(res).toEqual({ message: 'Provider successfully deactivated' });
    });
  });
});
