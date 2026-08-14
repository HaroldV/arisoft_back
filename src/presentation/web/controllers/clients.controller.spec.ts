import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientRepository } from '../../../infrastructure/persistence/typeorm/repositories/client.repository';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ClientsController (Unit & Integration Tests)', () => {
  let controller: ClientsController;
  let mockClientRepo: any;

  const validTenantId = '69430cba-f5b2-4cf2-b7e3-721394c1765c';
  const validClientId = '69430cba-f5b2-4cf2-b7e3-721394c1765d';
  const mockReq = { user: { tenant_id: validTenantId } };

  beforeEach(async () => {
    mockClientRepo = {
      findAll: jest.fn().mockResolvedValue([{ id: validClientId, name: 'Cliente Uno' }]),
      findAllByTenant: jest.fn().mockResolvedValue([{ id: validClientId, name: 'Cliente Uno' }]),
      findById: jest.fn().mockResolvedValue({ id: validClientId, name: 'Cliente Uno', tax_id: 'J-12345678-9' }),
      findByTaxId: jest.fn().mockResolvedValue(null),
      save: jest.fn((c) => Promise.resolve({ id: validClientId, ...c })),
      softDelete: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        { provide: ClientRepository, useValue: mockClientRepo },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /clients', () => {
    it('should return client list for tenant', async () => {
      const res = await controller.findAll(validTenantId, mockReq);
      expect(mockClientRepo.findAll).toHaveBeenCalled();
      expect(res).toEqual([{ id: validClientId, name: 'Cliente Uno' }]);
    });

    it('should throw BadRequestException if tenantId is invalid', async () => {
      await expect(controller.findAll('invalid-uuid', mockReq)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if tenantId does not match session', async () => {
      const otherTenant = '69430cba-f5b2-4cf2-b7e3-721394c1765f';
      await expect(controller.findAll(otherTenant, mockReq)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /clients', () => {
    it('should create new client if RIF is unique', async () => {
      const dto = { name: 'Nuevo Cliente', tax_id: 'J-99999999-9', email: 'nuevo@test.com' };
      const res = await controller.create(validTenantId, dto as any, mockReq);
      expect(mockClientRepo.save).toHaveBeenCalled();
      expect(res).toHaveProperty('name', 'Nuevo Cliente');
    });

    it('should throw BadRequestException if RIF already exists', async () => {
      mockClientRepo.findByTaxId.mockResolvedValueOnce({ id: 'existing-id', tax_id: 'J-99999999-9' });
      const dto = { name: 'Duplicado', tax_id: 'J-99999999-9' };
      await expect(controller.create(validTenantId, dto as any, mockReq)).rejects.toThrow(BadRequestException);
    });
  });

  describe('PUT /clients/:id', () => {
    it('should update client fields', async () => {
      const dto = { name: 'Cliente Modificado' };
      const res = await controller.update(validClientId, validTenantId, dto, mockReq);
      expect(mockClientRepo.save).toHaveBeenCalled();
      expect(res).toHaveProperty('name', 'Cliente Modificado');
    });
  });

  describe('DELETE /clients/:id', () => {
    it('should soft delete client', async () => {
      const res = await controller.delete(validClientId, validTenantId, mockReq);
      expect(mockClientRepo.softDelete).toHaveBeenCalledWith(validClientId);
      expect(res).toEqual({ message: 'Client successfully deactivated' });
    });
  });
});
