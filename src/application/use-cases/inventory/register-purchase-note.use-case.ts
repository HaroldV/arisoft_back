import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PurchaseInvoice } from '../../../domain/entities/purchase-invoice.entity';
import { PurchaseItem } from '../../../domain/entities/purchase-item.entity';
import { PurchaseFiscalNote } from '../../../domain/entities/purchase-fiscal-note.entity';
import { PurchaseFiscalNoteItem } from '../../../domain/entities/purchase-fiscal-note-item.entity';
import { FiscalNoteType } from '../../../domain/entities/sales-fiscal-note.entity';
import { Product } from '../../../domain/entities/product.entity';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { StockBalance } from '../../../domain/entities/stock-balance.entity';
import { WarehouseLocation } from '../../../domain/entities/warehouse-location.entity';
import { FiscalAuditLog } from '../../../domain/entities/fiscal-audit-log.entity';
import { PurchaseFiscalNoteRepository } from '../../../infrastructure/persistence/typeorm/repositories/purchase-fiscal-note.repository';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';

export interface RegisterPurchaseNoteItemDto {
  productId: string;
  quantity: number;
  description: string;
  unitPriceUsd: number;
}

export interface RegisterPurchaseNoteDto {
  originalInvoiceId: string;
  documentNumber: string;
  controlNumber: string;
  type: 'CREDIT' | 'DEBIT';
  reasonCode: 'RETURN' | 'DISCOUNT' | 'PRICE_ERR' | 'TAX_ERR' | 'OTHER';
  reasonDescription?: string;
  currency: string;
  exchangeRate: number;
  adjustStock?: boolean;
  locationId?: string;
  items: RegisterPurchaseNoteItemDto[];
}

@Injectable()
export class RegisterPurchaseNoteUseCase {
  constructor(
    private readonly purchaseFiscalNoteRepo: PurchaseFiscalNoteRepository,
    private readonly productRepo: ProductRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(tenantId: string, userId: string, ipAddress: string, dto: RegisterPurchaseNoteDto) {
    // 1. Validate original purchase invoice exists
    const invoice = await this.dataSource.manager.findOne(PurchaseInvoice, {
      where: { id: dto.originalInvoiceId, tenant_id: tenantId },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura de compra original con ID ${dto.originalInvoiceId} no encontrada`);
    }

    // 2. Validate original quantities
    const invoiceItems = await this.dataSource.manager.find(PurchaseItem, {
      where: { purchase_id: dto.originalInvoiceId },
    });
    const invoiceItemsMap = new Map(invoiceItems.map(item => [item.product_id, item.quantity]));

    for (const item of dto.items) {
      const originalQty = invoiceItemsMap.get(item.productId) || 0;
      if (item.quantity > originalQty) {
        throw new BadRequestException(
          `La cantidad a ajustar (${item.quantity}) excede la cantidad comprada originalmente (${originalQty}) para el producto ID ${item.productId}`
        );
      }
    }

    // 3. Validate products exist
    const productIds = dto.items.map(i => i.productId);
    const products = await this.productRepo.findByIds(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    // 4. Validate WMS location if adjusting stock
    if (dto.type === FiscalNoteType.CREDIT && dto.adjustStock && dto.locationId) {
      const location = await this.dataSource.manager.findOne(WarehouseLocation, {
        where: { id: dto.locationId, tenant_id: tenantId },
      });
      if (!location) {
        throw new NotFoundException(`Ubicación WMS con ID ${dto.locationId} no encontrada`);
      }
    }

    // 5. Run atomic transaction
    return this.dataSource.transaction(async (manager) => {
      // Calculate totals
      let subtotalUsd = 0;
      let taxAmountUsd = 0;

      const calculatedItems = dto.items.map(item => {
        const prod = productMap.get(item.productId);
        const taxRate = prod ? Number(prod.tax_rate) : 16.00;
        const baseUsd = item.quantity * item.unitPriceUsd;
        const taxUsd = baseUsd * (taxRate / 100);
        const totUsd = baseUsd + taxUsd;

        subtotalUsd += baseUsd;
        taxAmountUsd += taxUsd;

        const baseVes = baseUsd * dto.exchangeRate;
        const taxVes = taxUsd * dto.exchangeRate;
        const totVes = totUsd * dto.exchangeRate;

        return {
          product_id: item.productId,
          description: item.description || prod?.name || 'Ajuste fiscal de compra',
          quantity: item.quantity,
          unit_price_usd: item.unitPriceUsd,
          tax_rate: taxRate,
          tax_amount_usd: taxUsd,
          total_usd: totUsd,
          subtotal_ves: baseVes,
          tax_amount_ves: taxVes,
          total_ves: totVes,
        };
      });

      const totalUsd = subtotalUsd + taxAmountUsd;
      const subtotalVes = subtotalUsd * dto.exchangeRate;
      const taxAmountVes = taxAmountUsd * dto.exchangeRate;
      const totalVes = totalUsd * dto.exchangeRate;

      // Save Purchase Note Header
      const note = await manager.save(PurchaseFiscalNote, new PurchaseFiscalNote({
        tenant_id: tenantId,
        original_invoice_id: dto.originalInvoiceId,
        document_number: dto.documentNumber.trim(),
        control_number: dto.controlNumber.trim(),
        type: dto.type,
        date: new Date(),
        reason_code: dto.reasonCode,
        reason_description: dto.reasonDescription || null,
        currency: dto.currency,
        exchange_rate: dto.exchangeRate,
        subtotal_usd: subtotalUsd,
        tax_amount_usd: taxAmountUsd,
        total_usd: totalUsd,
        subtotal_ves: subtotalVes,
        tax_amount_ves: taxAmountVes,
        total_ves: totalVes,
        status: 'POSTED',
      }));

      // Save Purchase Note Items
      for (const calcItem of calculatedItems) {
        await manager.save(PurchaseFiscalNoteItem, new PurchaseFiscalNoteItem({
          note_id: note.id,
          ...calcItem,
        }));

        // Handle inventory egress if CREDIT note (returning products to supplier)
        if (dto.type === FiscalNoteType.CREDIT && dto.adjustStock && dto.locationId) {
          const prod = productMap.get(calcItem.product_id)!;

          // 5.1. Log negative StockMove ledger record
          await manager.save(StockMove, new StockMove({
            tenant_id: tenantId,
            product_id: calcItem.product_id,
            type: StockMoveType.ADJUSTMENT,
            quantity: -calcItem.quantity, // Negative for egress
            cost_at_time: prod.cost_usd,
            source_type: 'PURCHASE_NOTE',
            source_id: note.id,
            justification: `Devolución al proveedor según Nota Nro ${dto.documentNumber}`,
            created_by_user_id: userId,
          }));

          // 5.2. Update WMS StockBalance
          const balance = await manager.findOne(StockBalance, {
            where: {
              tenant_id: tenantId,
              location_id: dto.locationId,
              product_id: calcItem.product_id,
              batch_id: null,
            },
          });

          if (balance) {
            balance.quantity = Math.max(0, Number(balance.quantity) - calcItem.quantity);
            await manager.save(StockBalance, balance);
          }
        }
      }

      // 6. Write Audit Log (PA-121)
      const auditPayload = JSON.stringify({
        id: note.id,
        doc: dto.documentNumber,
        ctrl: dto.controlNumber,
        totalUsd,
        totalVes,
      });
      const checksum = Buffer.from(auditPayload).toString('base64').substring(0, 32);

      await manager.save(FiscalAuditLog, new FiscalAuditLog({
        tenant_id: tenantId,
        event_type: `REGISTRO_NOTA_COMPRA_${dto.type}`,
        document_id: note.id,
        user_id: userId,
        timestamp: new Date(),
        ip_address: ipAddress,
        hash_checksum: checksum,
      }));

      return {
        message: `Nota de ajuste de compra registrada con éxito`,
        noteId: note.id,
        documentNumber: note.document_number,
        controlNumber: note.control_number,
      };
    });
  }
}
