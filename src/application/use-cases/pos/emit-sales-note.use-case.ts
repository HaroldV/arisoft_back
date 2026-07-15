import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Sale } from '../../../domain/entities/sale.entity';
import { SaleItem } from '../../../domain/entities/sale-item.entity';
import { SalesFiscalNote, FiscalNoteType } from '../../../domain/entities/sales-fiscal-note.entity';
import { SalesFiscalNoteItem } from '../../../domain/entities/sales-fiscal-note-item.entity';
import { FiscalDocType } from '../../../domain/entities/tenant-fiscal-range.entity';
import { Product } from '../../../domain/entities/product.entity';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { StockBalance } from '../../../domain/entities/stock-balance.entity';
import { WarehouseLocation } from '../../../domain/entities/warehouse-location.entity';
import { FiscalAuditLog } from '../../../domain/entities/fiscal-audit-log.entity';
import { TenantFiscalRangeRepository } from '../../../infrastructure/persistence/postgresql/repositories/tenant-fiscal-range.repository';
import { SalesFiscalNoteRepository } from '../../../infrastructure/persistence/postgresql/repositories/sales-fiscal-note.repository';
import { ProductRepository } from '../../../infrastructure/persistence/postgresql/repositories/product.repository';

export interface EmitSalesNoteItemDto {
  productId: string;
  quantity: number;
  description: string;
  unitPriceUsd: number;
}

export interface EmitSalesNoteDto {
  originalInvoiceId: string;
  type: 'CREDIT' | 'DEBIT';
  reasonCode: 'RETURN' | 'DISCOUNT' | 'PRICE_ERR' | 'TAX_ERR' | 'OTHER';
  reasonDescription?: string;
  currency: string;
  exchangeRate: number;
  reenterStock?: boolean;
  locationId?: string;
  items: EmitSalesNoteItemDto[];
}

@Injectable()
export class EmitSalesNoteUseCase {
  constructor(
    private readonly salesFiscalNoteRepo: SalesFiscalNoteRepository,
    private readonly tenantFiscalRangeRepo: TenantFiscalRangeRepository,
    private readonly productRepo: ProductRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(tenantId: string, userId: string, ipAddress: string, dto: EmitSalesNoteDto) {
    // 1. Validate original sale exists
    const sale = await this.dataSource.manager.findOne(Sale, {
      where: { id: dto.originalInvoiceId, tenant_id: tenantId },
    });
    if (!sale) {
      throw new NotFoundException(`Factura de venta original con ID ${dto.originalInvoiceId} no encontrada`);
    }

    // 2. Validate original quantities
    const invoiceItems = await this.dataSource.manager.find(SaleItem, {
      where: { sale_id: dto.originalInvoiceId },
    });
    const invoiceItemsMap = new Map(invoiceItems.map(item => [item.product_id, item.quantity]));

    for (const item of dto.items) {
      const originalQty = invoiceItemsMap.get(item.productId) || 0;
      if (item.quantity > originalQty) {
        throw new BadRequestException(
          `La cantidad a ajustar (${item.quantity}) excede la cantidad vendida originalmente (${originalQty}) para el producto ID ${item.productId}`
        );
      }
    }

    // 3. Validate products exist and load tax rates
    const productIds = dto.items.map(i => i.productId);
    const products = await this.productRepo.findByIds(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    // 4. Validate WMS location if reentering stock
    if (dto.type === FiscalNoteType.CREDIT && dto.reenterStock && dto.locationId) {
      const location = await this.dataSource.manager.findOne(WarehouseLocation, {
        where: { id: dto.locationId, tenant_id: tenantId },
      });
      if (!location) {
        throw new NotFoundException(`Ubicación WMS con ID ${dto.locationId} no encontrada`);
      }
    }

    // 5. Run atomic transaction
    return this.dataSource.transaction(async (manager) => {
      // Resolve next fiscal and control numbers inside transaction block
      const noteTypeRange = dto.type === FiscalNoteType.CREDIT 
        ? FiscalDocType.CREDIT_NOTE 
        : FiscalDocType.DEBIT_NOTE;
      const numbers = await this.tenantFiscalRangeRepo.getNextRangeNumbers(noteTypeRange, manager);

      // Calculate totals
      let subtotalUsd = 0;
      let taxAmountUsd = 0;

      const calculatedItems = dto.items.map(item => {
        const prod = productMap.get(item.productId);
        const taxRate = prod ? Number(prod.tax_rate) : 16.00; // fallback to standard VAT
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
          description: item.description || prod?.name || 'Ajuste fiscal',
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

      // Save Note Header
      const note = await manager.save(SalesFiscalNote, new SalesFiscalNote({
        tenant_id: tenantId,
        original_invoice_id: dto.originalInvoiceId,
        document_number: numbers.documentNumber,
        control_number: numbers.controlNumber,
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
        status: 'POSTED', // Instantly published / final
      }));

      // Save Note Items
      for (const calcItem of calculatedItems) {
        await manager.save(SalesFiscalNoteItem, new SalesFiscalNoteItem({
          note_id: note.id,
          ...calcItem,
        }));

        // Handle inventory re-entry if CREDIT note
        if (dto.type === FiscalNoteType.CREDIT && dto.reenterStock && dto.locationId) {
          const prod = productMap.get(calcItem.product_id)!;

          // 5.1. Log positive StockMove ledger record
          await manager.save(StockMove, new StockMove({
            tenant_id: tenantId,
            product_id: calcItem.product_id,
            type: StockMoveType.ADJUSTMENT,
            quantity: calcItem.quantity, // Positive for ingress
            cost_at_time: prod.cost_usd,
            source_type: 'SALES_NOTE',
            source_id: note.id,
            justification: `Reingreso por Nota de Crédito ${numbers.documentNumber}`,
            created_by_user_id: userId,
          }));

          // 5.2. Update WMS StockBalance
          let balance = await manager.findOne(StockBalance, {
            where: {
              tenant_id: tenantId,
              location_id: dto.locationId,
              product_id: calcItem.product_id,
              batch_id: null, // returns do not specify batch initially
            },
          });

          if (balance) {
            balance.quantity = Number(balance.quantity) + calcItem.quantity;
            await manager.save(StockBalance, balance);
          } else {
            await manager.save(StockBalance, new StockBalance({
              tenant_id: tenantId,
              location_id: dto.locationId,
              product_id: calcItem.product_id,
              batch_id: null,
              quantity: calcItem.quantity,
            }));
          }
        }
      }

      // 6. Write Audit Log (PA-121)
      const auditPayload = JSON.stringify({
        id: note.id,
        doc: numbers.documentNumber,
        ctrl: numbers.controlNumber,
        totalUsd,
        totalVes,
      });
      // Simple hash generation for audit checksum
      const checksum = Buffer.from(auditPayload).toString('base64').substring(0, 32);

      await manager.save(FiscalAuditLog, new FiscalAuditLog({
        tenant_id: tenantId,
        event_type: `EMISION_NOTA_${dto.type}`,
        document_id: note.id,
        user_id: userId,
        timestamp: new Date(),
        ip_address: ipAddress,
        hash_checksum: checksum,
      }));

      return {
        message: `Nota de ${dto.type === FiscalNoteType.CREDIT ? 'Crédito' : 'Débito'} emitida con éxito`,
        noteId: note.id,
        documentNumber: note.document_number,
        controlNumber: note.control_number,
        totalUsd: note.total_usd,
        totalVes: note.total_ves,
      };
    });
  }
}
