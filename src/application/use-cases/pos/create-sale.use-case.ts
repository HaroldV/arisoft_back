import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Sale } from '../../../domain/entities/sale.entity';
import { SaleItem } from '../../../domain/entities/sale-item.entity';
import { StockMove, StockMoveType } from '../../../domain/entities/stock-move.entity';
import { SalePayment } from '../../../domain/entities/sale-payment.entity';
import { SaleRepository } from '../../../infrastructure/persistence/typeorm/repositories/sale.repository';
import { ProductRepository } from '../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { TenantRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { TenantFiscalRangeRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant-fiscal-range.repository';
import { CashShiftRepository } from '../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { FiscalDocType } from '../../../domain/entities/tenant-fiscal-range.entity';
import { UserRole } from '../../../domain/entities/user.entity';
import { CreateSaleDto } from './create-sale.dto';

import { BankAccount } from '../../../domain/entities/bank-account.entity';
import { BankMovement } from '../../../domain/entities/bank-movement.entity';

@Injectable()
export class CreateSaleUseCase {
  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly productRepo: ProductRepository,
    private readonly stockMoveRepo: StockMoveRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly tenantFiscalRangeRepo: TenantFiscalRangeRepository,
    private readonly cashShiftRepo: CashShiftRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(tenantId: string, user: { id: string; role?: string; permissions?: string[] }, dto: CreateSaleDto) {
    // 0. Validate active cashier shift (only enforced for CASHIER role)
    const activeShift = await this.cashShiftRepo.findActiveShift(user.id);
    if (user.role === UserRole.CASHIER && !activeShift) {
      throw new BadRequestException('Debes tener un turno de caja activo abierto para realizar una venta.');
    }

    // Validate discount authorization
    if (dto.discountPercent && dto.discountPercent > 0) {
      if (user.role !== UserRole.OWNER && !user.permissions?.includes('pos:discount')) {
        throw new BadRequestException('No tienes permiso para aplicar descuentos en las ventas');
      }
    }

    const userId = user.id;
    // 1. Load tenant settings
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const allowNegativeStock =
      tenant.settings?.allow_negative_stock === true ||
      tenant.settings?.allowNegativeStock === true;

    // 2. Validate all products exist
    const productIds = dto.items.map(i => i.productId);
    const uniqueProductIds = Array.from(new Set(productIds));
    const products = await this.productRepo.findByIds(uniqueProductIds);

    if (products.length !== uniqueProductIds.length) {
      const foundIds = new Set(products.map(p => p.id));
      const missingIds = uniqueProductIds.filter(id => !foundIds.has(id));
      throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
    }

    // Map products for easy access
    const productMap = new Map(products.map(p => [p.id, p]));

    // 3. Fetch current stocks
    const stockMap = await this.stockMoveRepo.getCurrentStocks(uniqueProductIds);

    // 4. Validate stock policies
    const itemStockRemanents = new Map<string, number>();
    let requiresJustification = false;

    for (const item of dto.items) {
      const currentStock = stockMap.get(item.productId) || 0;
      const remanent = currentStock - item.quantity;
      itemStockRemanents.set(item.productId, remanent);

      if (remanent < 0) {
        if (!allowNegativeStock) {
          const prod = productMap.get(item.productId);
          throw new BadRequestException(
            `Insufficient stock for product ${prod?.name || item.productId}. Available: ${currentStock}, requested: ${item.quantity}`,
          );
        }
        requiresJustification = true;
      }
    }

    if (requiresJustification && !dto.negativeStockJustification?.trim()) {
      throw new BadRequestException(
        'Venta causa stock negativo. negativeStockJustification es obligatoria.',
      );
    }

    // 5. Run atomic transaction
    return this.dataSource.transaction(async (manager) => {
      // Calculate total amount
      let totalAmountUsd = 0;
      for (const item of dto.items) {
        const prod = productMap.get(item.productId)!;
        totalAmountUsd += item.quantity * prod.price_usd;
      }

      if (dto.discountPercent && dto.discountPercent > 0) {
        totalAmountUsd = totalAmountUsd * (1 - dto.discountPercent / 100);
      }

      const exchangeRate = dto.exchangeRateApplied || 1.0;

      // Resolve next fiscal and control numbers inside transaction block
      const numbers = await this.tenantFiscalRangeRepo.getNextRangeNumbers(FiscalDocType.INVOICE, manager);

      // Determine branch and warehouse from active shift or user
      const branchId = activeShift?.branch_id || undefined;
      const warehouseLocationId = activeShift?.branch?.default_warehouse_id || undefined;

      // Save sale header
      const sale = await manager.save(Sale, new Sale({
        tenant_id: tenantId,
        user_id: userId,
        total_amount_usd: totalAmountUsd,
        exchange_rate_applied: exchangeRate,
        status: 'PAID',
        client_id: dto.clientId || null,
        invoice_number: numbers.documentNumber,
        control_number: numbers.controlNumber,
        payment_method: dto.paymentMethod || null,
        shift_id: activeShift?.id || null,
        branch_id: branchId || null,
      }));

      // Save split payments & update Treasury
      if (dto.payments && dto.payments.length > 0) {
        for (const payment of dto.payments) {
          const amtUsd = payment.currency === 'USD'
            ? payment.amountOriginal
            : Number((payment.amountOriginal / exchangeRate).toFixed(2));

          const savedPayment = await manager.save(SalePayment, new SalePayment({
            tenant_id: tenantId,
            sale_id: sale.id,
            payment_method: payment.paymentMethod,
            amount_original: payment.amountOriginal,
            currency: payment.currency,
            exchange_rate_applied: exchangeRate,
            amount_usd: amtUsd,
            transaction_reference: payment.transactionReference || null,
            bank_account_id: payment.bankAccountId || undefined,
            last_four_digits: payment.lastFourDigits || undefined,
            sender_identifier: payment.senderIdentifier || undefined,
          }));

          // If payment is linked to a registered bank account, adjust balance & create BankMovement
          if (payment.bankAccountId) {
            const bankAccount = await manager.findOne(BankAccount, {
              where: { id: payment.bankAccountId, tenant_id: tenantId, is_active: true },
            });
            if (bankAccount) {
              bankAccount.current_balance = Number(bankAccount.current_balance) + Number(payment.amountOriginal);
              await manager.save(BankAccount, bankAccount);

              const ref = payment.transactionReference || payment.lastFourDigits || `SALE-${sale.invoice_number || sale.id.slice(0, 8)}`;
              const senderDesc = payment.senderIdentifier ? ` (Emisor: ${payment.senderIdentifier})` : '';

              await manager.save(BankMovement, new BankMovement({
                tenant_id: tenantId,
                account_id: bankAccount.id,
                type: 'DEPOSIT',
                amount: Number(payment.amountOriginal),
                reference: ref,
                description: `Cobro Venta Factura #${sale.invoice_number || 'S/N'}${senderDesc}`,
                created_by_user_id: userId,
                sale_payment_id: savedPayment.id,
              }));
            }
          }
        }
      } else {
        // Fallback for backward compatibility/single payment
        const defaultMethod = dto.paymentMethod || 'CASH_USD';
        const defaultCurrency = defaultMethod.endsWith('VES') ? 'VES' : 'USD';
        const defaultAmtOrig = defaultCurrency === 'USD'
          ? totalAmountUsd
          : Number((totalAmountUsd * exchangeRate).toFixed(2));

        await manager.save(SalePayment, new SalePayment({
          tenant_id: tenantId,
          sale_id: sale.id,
          payment_method: defaultMethod,
          amount_original: defaultAmtOrig,
          currency: defaultCurrency,
          exchange_rate_applied: exchangeRate,
          amount_usd: totalAmountUsd,
        }));
      }

      // Save change if given
      if (dto.change) {
        const changeAmtUsd = dto.change.currency === 'USD'
          ? dto.change.amountOriginal
          : Number((dto.change.amountOriginal / exchangeRate).toFixed(2));

        await manager.save(SalePayment, new SalePayment({
          tenant_id: tenantId,
          sale_id: sale.id,
          payment_method: 'CHANGE_' + dto.change.currency,
          amount_original: -dto.change.amountOriginal,
          currency: dto.change.currency,
          exchange_rate_applied: exchangeRate,
          amount_usd: -changeAmtUsd,
        }));
      }

      // Process items and stock movements
      for (const item of dto.items) {
        const prod = productMap.get(item.productId)!;

        // Save sale item line
        await manager.save(SaleItem, new SaleItem({
          sale_id: sale.id,
          product_id: item.productId,
          quantity: item.quantity,
          price_at_time_usd: prod.price_usd,
        }));

        // Insert double-entry negative stock move (SALE)
        const finalRemanent = itemStockRemanents.get(item.productId)!;
        const justification = finalRemanent < 0 ? dto.negativeStockJustification?.trim() : undefined;

        await manager.save(StockMove, new StockMove({
          tenant_id: tenantId,
          product_id: item.productId,
          type: StockMoveType.SALE,
          quantity: -item.quantity, // Negative for egress
          cost_at_time: prod.cost_usd, // Egress registers at cost_usd
          source_type: 'SALE',
          source_id: sale.id,
          warehouse_location_id: warehouseLocationId || null,
          justification: justification || null,
          created_by_user_id: userId,
        }));
      }

      return {
        message: 'Sale registered successfully',
        saleId: sale.id,
        invoiceNumber: sale.invoice_number,
        controlNumber: sale.control_number,
        totalAmountUsd,
      };
    });
  }
}
