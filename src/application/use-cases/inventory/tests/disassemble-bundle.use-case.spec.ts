import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DisassembleBundleUseCase } from '../disassemble-bundle.use-case';
import { Product } from '../../../../domain/entities/product.entity';
import { ProductComponent } from '../../../../domain/entities/product-component.entity';
import { StockMoveType } from '../../../../domain/entities/stock-move.entity';

describe('DisassembleBundleUseCase (TDD)', () => {
  let useCase: DisassembleBundleUseCase;
  let mockProductRepo: any;
  let mockComponentRepo: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const userId = '99999999-9999-9999-9999-999999999999';
  const parentId = '11111111-1111-1111-1111-111111111111';
  const childId = '22222222-2222-2222-2222-222222222222';
  const warehouseId = '88888888-8888-8888-8888-888888888888';

  beforeEach(() => {
    mockProductRepo = {
      findById: jest.fn(),
      getStockForWarehouse: jest.fn(),
    };
    mockComponentRepo = {
      findByParentId: jest.fn(),
    };

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    useCase = new DisassembleBundleUseCase(mockProductRepo, mockComponentRepo, mockDataSource);
  });

  it('debe arrojar NotFoundException si el bulto no existe', async () => {
    mockProductRepo.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute(tenantId, userId, parentId, { warehouseId, bundlesToDisassemble: 1 })
    ).rejects.toThrow(NotFoundException);
  });

  it('debe arrojar BadRequestException si el producto no es de tipo COMPOUND', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Harina Simple', product_type: 'SIMPLE' });
    mockProductRepo.findById.mockResolvedValueOnce(parent);

    await expect(
      useCase.execute(tenantId, userId, parentId, { warehouseId, bundlesToDisassemble: 1 })
    ).rejects.toThrow(BadRequestException);
  });

  it('debe arrojar BadRequestException si el producto no tiene componentes definidos', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Bulto Vacío', product_type: 'COMPOUND' });
    mockProductRepo.findById.mockResolvedValueOnce(parent);
    mockComponentRepo.findByParentId.mockResolvedValueOnce([]);

    await expect(
      useCase.execute(tenantId, userId, parentId, { warehouseId, bundlesToDisassemble: 1 })
    ).rejects.toThrow(BadRequestException);
  });

  it('debe arrojar BadRequestException si no hay stock suficiente de bultos en el almacén', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Bulto Harina', product_type: 'COMPOUND' });
    const comp = new ProductComponent({ parent_product_id: parentId, child_product_id: childId, quantity: 20 });
    mockProductRepo.findById.mockResolvedValueOnce(parent);
    mockComponentRepo.findByParentId.mockResolvedValueOnce([comp]);
    mockProductRepo.getStockForWarehouse.mockResolvedValueOnce(0); // 0 bultos disponibles

    await expect(
      useCase.execute(tenantId, userId, parentId, { warehouseId, bundlesToDisassemble: 1 })
    ).rejects.toThrow(BadRequestException);

    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('debe desarmar 1 bulto (-1) e ingresar 20 unidades (+20) exitosamente con transacción ACID', async () => {
    const parent = new Product({ id: parentId, tenant_id: tenantId, name: 'Bulto Harina PAN 20x1kg', product_type: 'COMPOUND', cost_usd: 18.0 });
    const comp = new ProductComponent({ parent_product_id: parentId, child_product_id: childId, quantity: 20, unit_cost_at_definition: 0.9 });
    
    mockProductRepo.findById.mockResolvedValueOnce(parent);
    mockComponentRepo.findByParentId.mockResolvedValueOnce([comp]);
    mockProductRepo.getStockForWarehouse.mockResolvedValueOnce(3); // 3 bultos en almacén

    const result = await useCase.execute(tenantId, userId, parentId, {
      warehouseId,
      bundlesToDisassemble: 1,
      notes: 'Desarmado rápido para atender cliente en POS',
    });

    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();

    // Verificamos guardado de movimientos
    expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);

    // Primer movimiento: Deducción de bulto
    const firstMoveCall = mockQueryRunner.manager.save.mock.calls[0][0];
    expect(firstMoveCall.product_id).toBe(parentId);
    expect(firstMoveCall.quantity).toBe(-1);
    expect(firstMoveCall.type).toBe(StockMoveType.BUNDLE_DISASSEMBLY);

    // Segundo movimiento: Adición de unidades sueltas
    const secondMoveCall = mockQueryRunner.manager.save.mock.calls[1][0];
    expect(secondMoveCall.product_id).toBe(childId);
    expect(secondMoveCall.quantity).toBe(20);
    expect(secondMoveCall.type).toBe(StockMoveType.BUNDLE_DISASSEMBLY);

    expect(result.bundles_disassembled).toBe(1);
    expect(result.components_restocked[0].units_added).toBe(20);
  });
});
