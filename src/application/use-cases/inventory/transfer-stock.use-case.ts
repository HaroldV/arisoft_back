import { Injectable } from '@nestjs/common';
import { TransferStockDto } from './transfer-stock.dto';

@Injectable()
export class TransferStockUseCase {
  /**
   * execute
   * Purpose: Handle inter-warehouse transfers (T5.2.3 & T5.2.4).
   */
  async execute(tenantId: string, dto: TransferStockDto) {
    // 1. Transactional Logic (Double Entry Journaling)
    const exitMove = {
      tenant_id: tenantId,
      product_id: dto.productId,
      from_location: dto.fromLocationId,
      type: 'TRANSFER_EXIT',
      quantity: -dto.quantity, // Negative for exit
      status: 'IN_TRANSIT',
    };

    const entryMove = {
      tenant_id: tenantId,
      product_id: dto.productId,
      to_location: dto.toLocationId,
      type: 'TRANSFER_ENTRY',
      quantity: dto.quantity, // Positive for entry
      status: 'PENDING_RECEIPT',
    };

    return {
      message: 'Transfer initiated and marked as IN_TRANSIT',
      moves: [exitMove, entryMove],
    };
  }
}
