import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';

export interface CreateStockAdjustmentDto {
  product_id: string;
  type: StockMoveType.ADJUSTMENT | StockMoveType.INITIAL_LOAD;
  quantity: number; // Positive for entry, negative for exit
  justification: string;
  warehouse_location_id?: string;
}

export interface CreateStockTransferDto {
  product_id: string;
  quantity: number; // Positive quantity to transfer
  source_location_id: string;
  destination_location_id: string;
  justification: string;
}

@Injectable()
export class CreateStockAdjustmentUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly stockMoveRepo: StockMoveRepository,
  ) {}

  async execute(tenantId: string, userId: string, dto: CreateStockAdjustmentDto) {
    const product = await this.productRepo.findById(dto.product_id);
    if (!product) {
      throw new NotFoundException(`Producto con ID ${dto.product_id} no encontrado`);
    }

    const currentStock = await this.stockMoveRepo.getCurrentStock(dto.product_id);
    if (dto.quantity < 0 && (currentStock + dto.quantity < 0)) {
      throw new BadRequestException(`Stock insuficiente. Stock actual: ${currentStock}, Intento de ajuste: ${dto.quantity}`);
    }

    const move = new StockMove({
      tenant_id: tenantId,
      product_id: dto.product_id,
      type: dto.type || StockMoveType.ADJUSTMENT,
      quantity: dto.quantity,
      cost_at_time: Number(product.cost_usd || 0),
      justification: dto.justification,
      warehouse_location_id: dto.warehouse_location_id || undefined,
      created_by_user_id: userId,
    });

    return this.stockMoveRepo.save(move);
  }

  async executeTransfer(tenantId: string, userId: string, dto: CreateStockTransferDto) {
    const product = await this.productRepo.findById(dto.product_id);
    if (!product) {
      throw new NotFoundException(`Producto con ID ${dto.product_id} no encontrado`);
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException(`La cantidad a transferir debe ser mayor a 0`);
    }

    // Outflow move from source location
    const outMove = new StockMove({
      tenant_id: tenantId,
      product_id: dto.product_id,
      type: StockMoveType.TRANSFER,
      quantity: -dto.quantity,
      cost_at_time: Number(product.cost_usd || 0),
      justification: `Transferencia Salida: ${dto.justification}`,
      warehouse_location_id: dto.source_location_id,
      created_by_user_id: userId,
    });

    // Inflow move to destination location
    const inMove = new StockMove({
      tenant_id: tenantId,
      product_id: dto.product_id,
      type: StockMoveType.TRANSFER,
      quantity: dto.quantity,
      cost_at_time: Number(product.cost_usd || 0),
      justification: `Transferencia Entrada: ${dto.justification}`,
      warehouse_location_id: dto.destination_location_id,
      created_by_user_id: userId,
    });

    const savedOut = await this.stockMoveRepo.save(outMove);
    const savedIn = await this.stockMoveRepo.save(inMove);

    return { outMove: savedOut, inMove: savedIn };
  }
}
