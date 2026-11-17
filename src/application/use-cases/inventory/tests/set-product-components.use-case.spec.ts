import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SetProductComponentsUseCase } from '../set-product-components.use-case';
import { Product } from '../../../../domain/entities/product.entity';
import { ProductComponent } from '../../../../domain/entities/product-component.entity';

describe('SetProductComponentsUseCase (TDD)', () => {
  let useCase: SetProductComponentsUseCase;
  let mockProductRepo: any;
  let mockComponentRepo: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const parentId = '11111111-1111-1111-1111-111111111111';
  const childId1 = '22222222-2222-2222-2222-222222222222';
  const childId2 = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockProductRepo = {
      findById: jest.fn(),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };
    mockComponentRepo = {
      deleteByParentId: jest.fn().mockResolvedValue(undefined),
      saveComponents: jest.fn().mockImplementation((comps) => Promise.resolve(comps)),
    };

    useCase = new SetProductComponentsUseCase(mockProductRepo, mockComponentRepo);
  });

  it('debe arrojar NotFoundException si el producto padre no existe', async () => {
    mockProductRepo.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute(tenantId, parentId, { components: [{ childProductId: childId1, quantity: 20 }] })
    ).rejects.toThrow(NotFoundException);
  });

  it('debe revertir a SIMPLE y limpiar componentes si la lista enviada es vacía', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Bulto Harina', product_type: 'COMPOUND' });
    mockProductRepo.findById.mockResolvedValueOnce(parent);

    const result = await useCase.execute(tenantId, parentId, { components: [] });

    expect(result).toEqual([]);
    expect(mockComponentRepo.deleteByParentId).toHaveBeenCalledWith(parentId, tenantId);
    expect(parent.product_type).toBe('SIMPLE');
    expect(mockProductRepo.save).toHaveBeenCalledWith(parent);
  });

  it('debe arrojar BadRequestException si el producto padre intenta contenerse a sí mismo', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Bulto Harina' });
    mockProductRepo.findById.mockResolvedValueOnce(parent);

    await expect(
      useCase.execute(tenantId, parentId, { components: [{ childProductId: parentId, quantity: 10 }] })
    ).rejects.toThrow(BadRequestException);
  });

  it('debe arrojar BadRequestException si se envían componentes duplicados en la lista', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Bulto Harina' });
    const child = new Product({ id: childId1, tenant_id: tenantId, name: 'Harina 1kg', product_type: 'SIMPLE' });
    mockProductRepo.findById.mockResolvedValueOnce(parent);
    mockProductRepo.findById.mockResolvedValueOnce(child);

    await expect(
      useCase.execute(tenantId, parentId, {
        components: [
          { childProductId: childId1, quantity: 10 },
          { childProductId: childId1, quantity: 5 },
        ],
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('debe arrojar BadRequestException si un componente hijo ya es de tipo COMPOUND (evita anidación infinita)', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Combo Mega' });
    const childCompound = new Product({ id: childId1, tenant_id: tenantId, name: 'Otro Bulto', product_type: 'COMPOUND' });

    mockProductRepo.findById.mockResolvedValueOnce(parent); // Para el parent
    mockProductRepo.findById.mockResolvedValueOnce(childCompound); // Para el child

    await expect(
      useCase.execute(tenantId, parentId, {
        components: [{ childProductId: childId1, quantity: 2 }],
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('debe registrar los componentes exitosamente y actualizar el estado a COMPOUND', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Bulto Harina PAN 20x1kg', product_type: 'SIMPLE' });
    const child = new Product({ id: childId1, tenant_id: tenantId, name: 'Harina PAN 1kg', product_type: 'SIMPLE' });

    mockProductRepo.findById.mockResolvedValueOnce(parent);
    mockProductRepo.findById.mockResolvedValueOnce(child);

    const result = await useCase.execute(tenantId, parentId, {
      components: [{ childProductId: childId1, quantity: 20, unitCostAtDefinition: 0.95 }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(20);
    expect(parent.product_type).toBe('COMPOUND');
    expect(mockProductRepo.save).toHaveBeenCalledWith(parent);
    expect(mockComponentRepo.deleteByParentId).toHaveBeenCalledWith(parentId, tenantId);
    expect(mockComponentRepo.saveComponents).toHaveBeenCalled();
  });
});
