import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateRoleUseCase } from '../update-role.use-case';
import { DeleteRoleUseCase } from '../delete-role.use-case';
import { RoleRepository } from '../../../../infrastructure/persistence/typeorm/repositories/role.repository';
import { Role } from '../../../../domain/entities/role.entity';
import { DataSource } from 'typeorm';
import { User } from '../../../../domain/entities/user.entity';

describe('Role Management Use Cases (Update & Delete)', () => {
  let updateUseCase: UpdateRoleUseCase;
  let deleteUseCase: DeleteRoleUseCase;
  let mockRoleRepo: any;
  let mockDataSource: any;
  let mockUserRepo: any;

  const tenantId = 'tenant-uuid-1';
  const roleId = 'role-uuid-1';

  beforeEach(() => {
    mockRoleRepo = {
      findById: jest.fn(),
      findByName: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    mockUserRepo = {
      count: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === User) return mockUserRepo;
        return null;
      }),
    };

    updateUseCase = new UpdateRoleUseCase(mockRoleRepo);
    deleteUseCase = new DeleteRoleUseCase(mockRoleRepo, mockDataSource);
  });

  describe('UpdateRoleUseCase', () => {
    it('debe lanzar NotFoundException si el rol no existe o es de otro tenant', async () => {
      mockRoleRepo.findById.mockResolvedValue(null);

      await expect(
        updateUseCase.execute(tenantId, roleId, { role: 'OWNER', permissions: [] }, {
          name: 'Nuevo Nombre',
          allowed_permissions: ['pos:create'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si se intenta editar un rol del sistema (is_system: true)', async () => {
      mockRoleRepo.findById.mockResolvedValue(
        new Role({ id: roleId, tenant_id: tenantId, name: 'CASHIER', is_system: true }),
      );

      await expect(
        updateUseCase.execute(tenantId, roleId, { role: 'OWNER', permissions: [] }, {
          name: 'Cajero Modificado',
          allowed_permissions: ['pos:create'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe actualizar exitosamente un rol personalizado', async () => {
      const existingRole = new Role({
        id: roleId,
        tenant_id: tenantId,
        name: 'Vendedor Junior',
        allowed_permissions: ['pos:create'],
        is_system: false,
      });
      mockRoleRepo.findById.mockResolvedValue(existingRole);
      mockRoleRepo.findByName.mockResolvedValue(null);
      mockRoleRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      const updated = await updateUseCase.execute(
        tenantId,
        roleId,
        { role: 'OWNER', permissions: [] },
        { name: 'Vendedor Senior', allowed_permissions: ['pos:create', 'pos:discount'] },
      );

      expect(updated.name).toBe('Vendedor Senior');
      expect(updated.allowed_permissions).toContain('pos:discount');
      expect(mockRoleRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('DeleteRoleUseCase', () => {
    it('debe lanzar BadRequestException si el rol está asignado a uno o más usuarios', async () => {
      const role = new Role({ id: roleId, tenant_id: tenantId, name: 'Vendedor', is_system: false });
      mockRoleRepo.findById.mockResolvedValue(role);
      mockUserRepo.count.mockResolvedValue(2); // 2 usuarios usando el rol

      await expect(deleteUseCase.execute(tenantId, roleId)).rejects.toThrow(BadRequestException);
      expect(mockRoleRepo.delete).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si se intenta eliminar un rol de sistema', async () => {
      const role = new Role({ id: roleId, tenant_id: tenantId, name: 'OWNER', is_system: true });
      mockRoleRepo.findById.mockResolvedValue(role);

      await expect(deleteUseCase.execute(tenantId, roleId)).rejects.toThrow(BadRequestException);
    });

    it('debe eliminar exitosamente el rol si no tiene usuarios asignados', async () => {
      const role = new Role({ id: roleId, tenant_id: tenantId, name: 'Rol Vacío', is_system: false });
      mockRoleRepo.findById.mockResolvedValue(role);
      mockUserRepo.count.mockResolvedValue(0); // Sin usuarios
      mockRoleRepo.delete.mockResolvedValue(undefined);

      const res = await deleteUseCase.execute(tenantId, roleId);
      expect(res.success).toBe(true);
      expect(mockRoleRepo.delete).toHaveBeenCalledWith(roleId);
    });
  });
});
