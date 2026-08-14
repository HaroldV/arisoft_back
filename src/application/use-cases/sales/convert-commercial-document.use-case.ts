import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommercialDocumentRepository } from '../../../infrastructure/persistence/typeorm/repositories/commercial-document.repository';
import { CreateCommercialDocumentUseCase } from './create-commercial-document.use-case';
import { CommercialDocument, CommercialDocumentType, DocumentStatus } from '../../../domain/entities/commercial-document.entity';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';

@Injectable()
export class ConvertCommercialDocumentUseCase {
  constructor(
    private readonly documentRepository: CommercialDocumentRepository,
    private readonly createDocumentUseCase: CreateCommercialDocumentUseCase,
    @InjectRepository(StockMove)
    private readonly stockMoveRepo: Repository<StockMove>,
  ) {}

  async execute(
    tenantId: string,
    sourceId: string,
    targetType: CommercialDocumentType,
    user?: { id: string; name?: string },
    carrierInfo?: { carrier_name?: string; vehicle_plate?: string; driver_name?: string },
  ): Promise<CommercialDocument> {
    const sourceDoc = await this.documentRepository.findById(sourceId);
    if (!sourceDoc || sourceDoc.tenant_id !== tenantId) {
      throw new NotFoundException('Documento origen no encontrado');
    }

    if (sourceDoc.status === DocumentStatus.CONVERTED) {
      throw new BadRequestException(`El documento #${sourceDoc.document_number} ya fue convertido anteriormente`);
    }

    // Create target document copying items and client details
    const newDoc = await this.createDocumentUseCase.execute(
      tenantId,
      {
        document_type: targetType,
        client_id: sourceDoc.client_id,
        client_name: sourceDoc.client_name,
        client_tax_id: sourceDoc.client_tax_id,
        issue_date: sourceDoc.issue_date,
        valid_until: sourceDoc.valid_until,
        delivery_date: sourceDoc.delivery_date,
        payment_method: sourceDoc.payment_method,
        exchange_rate: sourceDoc.exchange_rate,
        carrier_name: carrierInfo?.carrier_name || sourceDoc.carrier_name,
        vehicle_plate: carrierInfo?.vehicle_plate || sourceDoc.vehicle_plate,
        driver_name: carrierInfo?.driver_name || sourceDoc.driver_name,
        notes: `Convertido a partir de ${sourceDoc.document_type} #${sourceDoc.document_number}`,
        items: (sourceDoc.items || []).map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          unit_price_usd: Number(item.unit_price_usd),
          quantity: Number(item.quantity),
        })),
      },
      user,
    );

    // Deduct physical inventory stock if target is DELIVERY_NOTE
    if (targetType === CommercialDocumentType.DELIVERY_NOTE) {
      for (const item of sourceDoc.items || []) {
        if (item.product_id) {
          const move = this.stockMoveRepo.create({
            tenant_id: tenantId,
            product_id: item.product_id,
            type: StockMoveType.SALE,
            quantity: -Math.abs(Number(item.quantity)),
            cost_at_time: Number(item.unit_price_usd || 0),
            source_id: newDoc.id,
            source_type: 'DELIVERY_NOTE',
            justification: `Despacho por Nota de Entrega #${newDoc.document_number}`,
          });
          await this.stockMoveRepo.save(move);
        }
      }
    }

    // Update source document status
    sourceDoc.status = DocumentStatus.CONVERTED;
    await this.documentRepository.save(sourceDoc);

    return newDoc;
  }
}
