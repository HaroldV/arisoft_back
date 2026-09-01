import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from '../../../domain/entities/purchase-order.entity';
import { PurchaseReceptionNote } from '../../../domain/entities/purchase-reception.entity';

export interface CancelPurchaseOrderDto {
  reason: string;
}

@Injectable()
export class CancelPurchaseOrderUseCase {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly orderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseReceptionNote)
    private readonly receptionRepository: Repository<PurchaseReceptionNote>,
  ) {}

  async execute(
    tenantId: string,
    userId: string,
    userName: string,
    orderId: string,
    dto: CancelPurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException('El motivo de anulación es obligatorio y debe tener al menos 5 caracteres');
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId, tenant_id: tenantId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`La Orden de Compra con ID ${orderId} no existe`);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException(`La Orden de Compra ${order.order_number} ya se encuentra anulada`);
    }

    // Check if there are active receptions associated with this order
    const receptions = await this.receptionRepository.find({
      where: { order_id: order.id, tenant_id: tenantId },
    });

    const activeReceptions = receptions.filter(r => r.status !== 'CANCELLED');
    if (activeReceptions.length > 0) {
      throw new BadRequestException(
        `No se puede anular la orden ${order.order_number} porque ya posee recepciones de almacén registradas.`
      );
    }

    order.status = 'CANCELLED';
    order.cancellation_reason = dto.reason.trim();
    order.cancelled_at = new Date();
    order.cancelled_by_user_id = userId;

    return await this.orderRepository.save(order);
  }
}
