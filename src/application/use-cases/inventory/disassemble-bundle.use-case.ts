import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { ProductComponentRepository } from '../../../infrastructure/persistence/typeorm/repositories/product-component.repository';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { DisassembleBundleDto } from './dto/disassemble-bundle.dto';

@Injectable()
export class DisassembleBundleUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly componentRepo: ProductComponentRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(tenantId: string, userId: string, parentProductId: string, dto: DisassembleBundleDto): Promise<{
    message: string;
    parent_product_id: string;
    bundles_disassembled: number;
    components_restocked: {
      child_product_id: string;
      units_added: number;
    }[];
  }> {
    // 1. Validar que el producto padre exista y sea de tipo COMPOUND
    const parentProduct = await this.productRepo.findById(parentProductId, tenantId);
    if (!parentProduct) {
      throw new NotFoundException(`Producto con ID ${parentProductId} no encontrado.`);
    }

    if (parentProduct.product_type !== 'COMPOUND') {
      throw new BadRequestException(`El producto '${parentProduct.name}' no está catalogado como producto compuesto / bulto.`);
    }

    // 2. Obtener la receta/componentes
    const components = await this.componentRepo.findByParentId(parentProductId, tenantId);
    if (!components || components.length === 0) {
      throw new BadRequestException(`El producto '${parentProduct.name}' no tiene componentes configurados para desarmar.`);
    }

    // 3. Ejecutar transacción ACID para asegurar atomicidad
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3.1 Calcular stock actual del bulto en el almacén especificado
      const currentBundleStock = await this.productRepo.getStockForWarehouse(parentProductId, dto.warehouseId, tenantId);
      if (currentBundleStock < dto.bundlesToDisassemble) {
        throw new BadRequestException(
          `Stock insuficiente en el almacén. Tienes ${currentBundleStock} bulto(s) disponible(s) e intentas desarmar ${dto.bundlesToDisassemble}.`
        );
      }

      // 3.2 Movimiento de Salida (Deducción de bultos)
      const parentCost = Number(parentProduct.cost_usd || 0);
      const parentDeductionMove = new StockMove({
        tenant_id: tenantId,
        product_id: parentProductId,
        type: StockMoveType.BUNDLE_DISASSEMBLY,
        quantity: -Math.abs(dto.bundlesToDisassemble),
        cost_at_time: parentCost,
        warehouse_location_id: dto.warehouseId,
        created_by_user_id: userId,
        justification: dto.notes || `Desarmado de ${dto.bundlesToDisassemble} bulto(s) para venta al detal / unidades en POS`,
      });
      await queryRunner.manager.save(parentDeductionMove);

      // 3.3 Movimiento de Entrada para cada producto componente
      const restockedList: { child_product_id: string; units_added: number }[] = [];

      for (const comp of components) {
        const unitsToAdd = Number(comp.quantity) * dto.bundlesToDisassemble;
        const childCost = Number(comp.unit_cost_at_definition || 0);

        const childRestockMove = new StockMove({
          tenant_id: tenantId,
          product_id: comp.child_product_id,
          type: StockMoveType.BUNDLE_DISASSEMBLY,
          quantity: unitsToAdd,
          cost_at_time: childCost,
          warehouse_location_id: dto.warehouseId,
          created_by_user_id: userId,
          justification: `Ingreso de unidades por desarmado de bulto '${parentProduct.name}' (${dto.bundlesToDisassemble} bulto(s))`,
        });
        await queryRunner.manager.save(childRestockMove);

        restockedList.push({
          child_product_id: comp.child_product_id,
          units_added: unitsToAdd,
        });
      }

      await queryRunner.commitTransaction();

      return {
        message: `Se desarmaron exitosamente ${dto.bundlesToDisassemble} bulto(s) de '${parentProduct.name}'.`,
        parent_product_id: parentProductId,
        bundles_disassembled: dto.bundlesToDisassemble,
        components_restocked: restockedList,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
