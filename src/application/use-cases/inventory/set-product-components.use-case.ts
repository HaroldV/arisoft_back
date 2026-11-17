import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { ProductComponentRepository } from '../../../infrastructure/persistence/typeorm/repositories/product-component.repository';
import { ProductComponent } from '../../../domain/entities/product-component.entity';
import { SetProductComponentsDto } from './dto/set-product-components.dto';

@Injectable()
export class SetProductComponentsUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly componentRepo: ProductComponentRepository,
  ) {}

  async execute(tenantId: string, parentProductId: string, dto: SetProductComponentsDto): Promise<ProductComponent[]> {
    // 1. Validar que el producto padre exista y pertenezca al tenant
    const parentProduct = await this.productRepo.findById(parentProductId, tenantId);
    if (!parentProduct) {
      throw new NotFoundException(`Producto padre con ID ${parentProductId} no encontrado.`);
    }

    // 2. Si components está vacío, revertir a SIMPLE y limpiar componentes
    if (!dto.components || dto.components.length === 0) {
      await this.componentRepo.deleteByParentId(parentProductId, tenantId);
      parentProduct.product_type = 'SIMPLE';
      await this.productRepo.save(parentProduct);
      return [];
    }

    // 3. Validar unicidad y evitar autoreferencias
    const childIds = new Set<string>();
    for (const comp of dto.components) {
      if (comp.childProductId === parentProductId) {
        throw new BadRequestException('Un producto compuesto no puede tenerse a sí mismo como componente.');
      }
      if (childIds.has(comp.childProductId)) {
        throw new BadRequestException(`El producto componente con ID ${comp.childProductId} está duplicado en la lista.`);
      }
      childIds.add(comp.childProductId);

      // Validar existencia de cada producto hijo
      const child = await this.productRepo.findById(comp.childProductId, tenantId);
      if (!child) {
        throw new NotFoundException(`El producto componente con ID ${comp.childProductId} no existe.`);
      }
      if (child.product_type === 'COMPOUND') {
        throw new BadRequestException(`El componente ${child.name} es otro producto compuesto. La anidación recursiva no está permitida.`);
      }
    }

    // 4. Limpiar componentes anteriores y guardar nuevos
    await this.componentRepo.deleteByParentId(parentProductId, tenantId);

    const componentsToSave = dto.components.map((c) => {
      return new ProductComponent({
        tenant_id: tenantId,
        parent_product_id: parentProductId,
        child_product_id: c.childProductId,
        quantity: c.quantity,
        unit_cost_at_definition: c.unitCostAtDefinition || 0,
      });
    });

    const saved = await this.componentRepo.saveComponents(componentsToSave);

    // 5. Marcar producto padre como COMPOUND
    parentProduct.product_type = 'COMPOUND';
    await this.productRepo.save(parentProduct);

    return saved;
  }
}
