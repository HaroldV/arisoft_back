import { NotFoundException } from '@nestjs/common';
import { GetParentBundlesUseCase } from '../get-parent-bundles.use-case';
import { Product } from '../../../../domain/entities/product.entity';
import { ProductComponent } from '../../../../domain/entities/product-component.entity';

describe('GetParentBundlesUseCase (TDD)', () => {
  let useCase: GetParentBundlesUseCase;
  let mockProductRepo: any;
  let mockComponentRepo: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const childId = '22222222-2222-2222-2222-222222222222';
  const parentId = '11111111-1111-1111-1111-111111111111';
  const warehouseId = '88888888-8888-8888-8888-888888888888';

  beforeEach(() => {
    mockProductRepo = {
      findById: jest.fn(),
      getStockForWarehouse: jest.fn(),
    };
    mockComponentRepo = {
      findParentBundlesForChild: jest.fn(),
    };

    useCase = new GetParentBundlesUseCase(mockProductRepo, mockComponentRepo);
  });

  it('debe arrojar NotFoundException si el producto hijo no existe', async () => {
    mockProductRepo.findById.mockResolvedValueOnce(null);

    await expect(useCase.execute(tenantId, childId, warehouseId)).rejects.toThrow(NotFoundException);
  });

  it('debe retornar lista vacía si el producto no forma parte de ningún bulto', async () => {
    const child = new Product({ id: childId, tenant_id: tenantId, name: 'Tornillo Suelto' });
    mockProductRepo.findById.mockResolvedValueOnce(child);
    mockComponentRepo.findParentBundlesForChild.mockResolvedValueOnce([]);

    const result = await useCase.execute(tenantId, childId, warehouseId);
    expect(result).toEqual([]);
  });

  it('debe retornar información del bulto padre y el stock disponible para el POS', async () => {
    const child = new Product({ id: childId, tenant_id: tenantId, name: 'Harina PAN 1kg' });
    const parent = new Product({
      id: parentId,
      tenant_id: tenantId,
      name: 'Bulto Harina PAN 20x1kg',
      sku: 'BULT-HPAN-20',
      price_usd: 19.5,
      product_type: 'COMPOUND',
    });

    const rel = new ProductComponent({
      parent_product_id: parentId,
      child_product_id: childId,
      quantity: 20,
      parent_product: parent,
    });

    mockProductRepo.findById.mockResolvedValueOnce(child);
    mockComponentRepo.findParentBundlesForChild.mockResolvedValueOnce([rel]);
    mockProductRepo.getStockForWarehouse.mockResolvedValueOnce(4); // 4 bultos en almacén

    const result = await useCase.execute(tenantId, childId, warehouseId);

    expect(result).toHaveLength(1);
    expect(result[0].bundle_id).toBe(parentId);
    expect(result[0].bundle_name).toBe('Bulto Harina PAN 20x1kg');
    expect(result[0].bundle_sku).toBe('BULT-HPAN-20');
    expect(result[0].units_per_bundle).toBe(20);
    expect(result[0].available_bundles).toBe(4);
  });
});
