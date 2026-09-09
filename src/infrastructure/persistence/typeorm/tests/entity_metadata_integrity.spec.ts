import { DataSource } from 'typeorm';
import { User } from '../../../../domain/entities/user.entity';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { Product } from '../../../../domain/entities/product.entity';
import { StockMove } from '../../../../domain/entities/stock-move.entity';
import { PasswordResetToken } from '../../../../domain/entities/password-reset-token.entity';
import { RefreshToken } from '../../../../domain/entities/refresh-token.entity';
import { PurchaseInvoice } from '../../../../domain/entities/purchase-invoice.entity';
import { PurchaseItem } from '../../../../domain/entities/purchase-item.entity';
import { Sale } from '../../../../domain/entities/sale.entity';
import { SaleItem } from '../../../../domain/entities/sale-item.entity';
import { Provider } from '../../../../domain/entities/provider.entity';
import { Client } from '../../../../domain/entities/client.entity';
import { BankAccount } from '../../../../domain/entities/bank-account.entity';
import { BankMovement } from '../../../../domain/entities/bank-movement.entity';
import { Category } from '../../../../domain/entities/category.entity';
import { WarehouseLocation } from '../../../../domain/entities/warehouse-location.entity';
import { ProductBatch } from '../../../../domain/entities/product-batch.entity';
import { StockBalance } from '../../../../domain/entities/stock-balance.entity';
import { TenantFiscalRange } from '../../../../domain/entities/tenant-fiscal-range.entity';
import { SalesFiscalNote } from '../../../../domain/entities/sales-fiscal-note.entity';
import { SalesFiscalNoteItem } from '../../../../domain/entities/sales-fiscal-note-item.entity';
import { PurchaseFiscalNote } from '../../../../domain/entities/purchase-fiscal-note.entity';
import { PurchaseFiscalNoteItem } from '../../../../domain/entities/purchase-fiscal-note-item.entity';
import { FiscalAuditLog } from '../../../../domain/entities/fiscal-audit-log.entity';
import { Role } from '../../../../domain/entities/role.entity';
import { AccountReceivablePayable } from '../../../../domain/entities/account-receivable-payable.entity';
import { AccountReceivable } from '../../../../domain/entities/account-receivable.entity';
import { AccountPayable } from '../../../../domain/entities/account-payable.entity';
import { AccountPayment } from '../../../../domain/entities/account-payment.entity';
import { StockSnapshot } from '../../../../domain/entities/stock-snapshot.entity';
import { CommercialDocument } from '../../../../domain/entities/commercial-document.entity';
import { CommercialDocumentItem } from '../../../../domain/entities/commercial-document-item.entity';
import { PurchaseOrder, PurchaseOrderItem } from '../../../../domain/entities/purchase-order.entity';
import { PurchaseReceptionNote, PurchaseReceptionItem, PurchaseReceptionItemSerial } from '../../../../domain/entities/purchase-reception.entity';
import { ProductCostHistory } from '../../../../domain/entities/product-cost-history.entity';
import { SalePayment } from '../../../../domain/entities/sale-payment.entity';
import { CashShift } from '../../../../domain/entities/cash-shift.entity';
import { SaasPlan } from '../../../../domain/entities/saas-plan.entity';
import { SubscriptionPaymentReceipt } from '../../../../domain/entities/subscription-payment-receipt.entity';
import { SystemSetting } from '../../../../domain/entities/system-setting.entity';
import { ExchangeRateHistory } from '../../../../domain/entities/exchange-rate-history.entity';
import { SchemaMigrationLock } from '../../../../domain/entities/schema-migration-lock.entity';
import { Branch } from '../../../../domain/entities/branch.entity';

describe('TypeORM Entity Metadata Integrity Gate (CI & Production Guard)', () => {
  const allEntities = [
    User, Tenant, Product, StockMove, PasswordResetToken, RefreshToken,
    PurchaseInvoice, PurchaseItem, Sale, SaleItem, Provider, Client,
    BankAccount, BankMovement, Category, WarehouseLocation, ProductBatch,
    StockBalance, TenantFiscalRange, SalesFiscalNote, SalesFiscalNoteItem,
    PurchaseFiscalNote, PurchaseFiscalNoteItem, FiscalAuditLog, Role,
    AccountReceivablePayable, AccountReceivable, AccountPayable, AccountPayment,
    StockSnapshot, CommercialDocument, CommercialDocumentItem, PurchaseOrder,
    PurchaseOrderItem, PurchaseReceptionNote, PurchaseReceptionItem,
    PurchaseReceptionItemSerial, ProductCostHistory, SalePayment, CashShift,
    SaasPlan, SubscriptionPaymentReceipt, SystemSetting, ExchangeRateHistory,
    SchemaMigrationLock, Branch,
  ];

  it('should successfully build all TypeORM entity metadatas without unresolvable relations', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      entities: allEntities,
    });

    // buildMetadatas() verifies all @ManyToOne, @OneToMany, @JoinColumn mappings
    await expect((dataSource as any).buildMetadatas()).resolves.toBeUndefined();

    const userMetadata = dataSource.getMetadata(User);
    expect(userMetadata).toBeDefined();

    const branchRelation = userMetadata.findRelationWithPropertyPath('branch');
    expect(branchRelation).toBeDefined();
    expect(branchRelation?.inverseEntityMetadata.target).toBe(Branch);

    const roleRelation = userMetadata.findRelationWithPropertyPath('role_ref');
    expect(roleRelation).toBeDefined();
    expect(roleRelation?.inverseEntityMetadata.target).toBe(Role);

    const accountPaymentMetadata = dataSource.getMetadata(AccountPayment);
    expect(accountPaymentMetadata).toBeDefined();
    expect(accountPaymentMetadata.findRelationWithPropertyPath('payable_account')?.inverseEntityMetadata.target).toBe(AccountPayable);
    expect(accountPaymentMetadata.findRelationWithPropertyPath('receivable_account')?.inverseEntityMetadata.target).toBe(AccountReceivable);
  });
});
