import { Injectable, BadRequestException } from '@nestjs/common';
import { CommercialDocumentRepository } from '../../../infrastructure/persistence/typeorm/repositories/commercial-document.repository';
import { CreateCommercialDocumentDto } from './dto/create-commercial-document.dto';
import { CommercialDocument, CommercialDocumentType, DocumentStatus } from '../../../domain/entities/commercial-document.entity';
import { CommercialDocumentItem } from '../../../domain/entities/commercial-document-item.entity';
import { StockMoveRepository } from '../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { AccountReceivableRepository } from '../../../infrastructure/persistence/typeorm/repositories/account-receivable.repository';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { AccountReceivable, AccountStatus } from '../../../domain/entities/account-receivable.entity';

@Injectable()
export class CreateCommercialDocumentUseCase {
  constructor(
    private readonly documentRepository: CommercialDocumentRepository,
    private readonly stockMoveRepository: StockMoveRepository,
    private readonly productRepository: ProductRepository,
    private readonly accountReceivableRepo: AccountReceivableRepository,
  ) {}

  async execute(
    tenantId: string,
    dto: CreateCommercialDocumentDto,
    user?: { id: string; name?: string },
  ): Promise<CommercialDocument> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El documento comercial debe incluir al menos 1 artículo');
    }

    const exchangeRate = dto.exchange_rate || 36.50;
    const documentNumber = await this.documentRepository.generateNextNumber(tenantId, dto.document_type);

    let subtotalUsd = 0;
    let taxUsd = 0;

    const items: CommercialDocumentItem[] = dto.items.map((itemDto) => {
      const qty = Number(itemDto.quantity || 1);
      const price = Number(itemDto.unit_price_usd || 0);
      const itemSubtotal = Number((qty * price).toFixed(2));
      const taxRate = itemDto.tax_rate !== undefined ? itemDto.tax_rate : 16;
      const itemTax = Number((itemSubtotal * (taxRate / 100)).toFixed(2));
      const itemTotal = Number((itemSubtotal + itemTax).toFixed(2));

      subtotalUsd += itemSubtotal;
      taxUsd += itemTax;

      const item = new CommercialDocumentItem();
      item.product_id = itemDto.product_id;
      item.product_name = itemDto.product_name;
      item.sku = itemDto.sku;
      item.unit_price_usd = price;
      item.quantity = qty;
      item.subtotal_usd = itemSubtotal;
      item.tax_usd = itemTax;
      item.total_usd = itemTotal;
      return item;
    });

    const totalUsd = Number((subtotalUsd + taxUsd).toFixed(2));
    const totalBs = Number((totalUsd * exchangeRate).toFixed(2));

    const doc = new CommercialDocument();
    doc.tenant_id = tenantId;
    doc.document_type = dto.document_type;
    doc.document_number = documentNumber;
    doc.client_id = dto.client_id;
    doc.client_name = dto.client_name;
    doc.client_tax_id = dto.client_tax_id;
    doc.status = dto.document_type === CommercialDocumentType.QUOTATION ? DocumentStatus.SENT
               : dto.document_type === CommercialDocumentType.SALES_ORDER ? DocumentStatus.APPROVED
               : DocumentStatus.DISPATCHED;
    doc.issue_date = dto.issue_date;
    doc.valid_until = dto.valid_until;
    doc.delivery_date = dto.delivery_date;
    doc.payment_method = dto.payment_method;
    doc.subtotal_usd = Number(subtotalUsd.toFixed(2));
    doc.tax_usd = Number(taxUsd.toFixed(2));
    doc.total_usd = totalUsd;
    doc.exchange_rate = exchangeRate;
    doc.total_bs = totalBs;
    doc.carrier_name = dto.carrier_name;
    doc.vehicle_plate = dto.vehicle_plate;
    doc.driver_name = dto.driver_name;
    doc.notes = dto.notes;
    doc.created_by_user_id = user?.id;
    doc.created_by_user_name = user?.name;
    doc.items = items;

    const savedDoc = await this.documentRepository.save(doc);

    // If it's a Delivery Note (Nota de Entrega), deduct stock AND register in Cuentas por Cobrar (RECEIVABLE)
    if (dto.document_type === CommercialDocumentType.DELIVERY_NOTE) {
      // 1. Deduct Stock Moves
      for (const itemDto of dto.items) {
        if (itemDto.product_id) {
          const move = new StockMove({
            tenant_id: tenantId,
            product_id: itemDto.product_id,
            type: StockMoveType.SALE,
            quantity: -Math.abs(itemDto.quantity),
            cost_at_time: itemDto.unit_price_usd,
            source_type: 'DELIVERY_NOTE',
            source_id: savedDoc.id,
            justification: `Despacho por Nota de Entrega #${savedDoc.document_number}`,
            created_by_user_id: user?.id,
          });
          await this.stockMoveRepository.save(move);
        }
      }

      // 2. Register Account Receivable in Cuentas por Cobrar (accounts_receivable)
      const account = new AccountReceivable();
      account.tenant_id = tenantId;
      account.client_id = savedDoc.client_id;
      account.client_name = savedDoc.client_name;
      account.reference_document_id = savedDoc.id;
      account.reference_document_number = savedDoc.document_number;
      account.reference_date = savedDoc.issue_date || new Date().toISOString().split('T')[0];
      account.notes = `Pendiente por Cobrar / Facturar - Nota de Entrega #${savedDoc.document_number}`;
      account.previous_balance = 0;
      account.period_amount = savedDoc.total_usd;
      account.total_paid = 0;
      account.balance_due = savedDoc.total_usd;
      account.status = AccountStatus.PENDING;
      account.created_by_user_id = user?.id;
      account.created_by_user_name = user?.name;

      await this.accountReceivableRepo.save(account);
    }

    return savedDoc;
  }
}
