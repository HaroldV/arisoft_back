import { Module, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { APP_GUARD } from '@nestjs/core';
import { InventoryController } from './presentation/web/controllers/inventory.controller';
import { AuthController } from './presentation/web/controllers/auth.controller';
import { SalesController } from './presentation/web/controllers/sales.controller';
import { CashShiftsController } from './presentation/web/controllers/cash-shifts.controller';
import { BulkUploadProductsUseCase } from './application/use-cases/inventory/bulk-upload-products.use-case';
import { RegisterPurchaseUseCase } from './application/use-cases/inventory/register-purchase.use-case';
import { UpdateProductUseCase } from './application/use-cases/inventory/update-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/inventory/delete-product.use-case';
import { CreateStockAdjustmentUseCase } from './application/use-cases/inventory/create-stock-adjustment.use-case';
import { CreateSaleUseCase } from './application/use-cases/pos/create-sale.use-case';
import { OpenShiftUseCase } from './application/use-cases/pos/open-shift.use-case';
import { GetActiveShiftUseCase } from './application/use-cases/pos/get-active-shift.use-case';
import { CloseShiftUseCase } from './application/use-cases/pos/close-shift.use-case';
import { ApproveShiftUseCase } from './application/use-cases/pos/approve-shift.use-case';
import { EmitSalesNoteUseCase } from './application/use-cases/pos/emit-sales-note.use-case';
import { RegisterPurchaseNoteUseCase } from './application/use-cases/inventory/register-purchase-note.use-case';
import { LoginUseCase } from './application/use-cases/auth/login.use-case';
import { RegisterTenantUseCase } from './application/use-cases/tenant/register-tenant.use-case';
import { ProductRepository } from './infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from './infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { UserRepository } from './infrastructure/persistence/typeorm/repositories/user.repository';
import { TenantRepository } from './infrastructure/persistence/typeorm/repositories/tenant.repository';
import { PurchaseInvoiceRepository } from './infrastructure/persistence/typeorm/repositories/purchase-invoice.repository';
import { SaleRepository } from './infrastructure/persistence/typeorm/repositories/sale.repository';
import { SalePaymentRepository } from './infrastructure/persistence/typeorm/repositories/sale-payment.repository';
import { CashShiftRepository } from './infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { AuthService } from './application/use-cases/auth/auth.service';
import { FiscalRangesController } from './presentation/web/controllers/fiscal-ranges.controller';
import { GetFiscalRangesUseCase } from './application/use-cases/tenant/get-fiscal-ranges.use-case';
import { ConfigureFiscalRangeUseCase } from './application/use-cases/tenant/configure-fiscal-range.use-case';
import { User } from './domain/entities/user.entity';
import { TenantProfileController } from './presentation/web/controllers/tenant-profile.controller';
import { GetCompanyProfileUseCase } from './application/use-cases/tenant/get-company-profile.use-case';
import { UpdateCompanyProfileUseCase } from './application/use-cases/tenant/update-company-profile.use-case';
import { Tenant } from './domain/entities/tenant.entity';
import { Product } from './domain/entities/product.entity';
import { StockMove } from './domain/entities/stock-move.entity';
import { PurchaseInvoice } from './domain/entities/purchase-invoice.entity';
import { PurchaseItem } from './domain/entities/purchase-item.entity';
import { Sale } from './domain/entities/sale.entity';
import { SaleItem } from './domain/entities/sale-item.entity';
import { ForgotPasswordUseCase } from './application/use-cases/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/auth/reset-password.use-case';
import { PasswordResetTokenRepository } from './infrastructure/persistence/typeorm/repositories/password-reset-token.repository';
import { PasswordResetToken } from './domain/entities/password-reset-token.entity';
import { RefreshToken } from './domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from './infrastructure/persistence/typeorm/repositories/refresh-token.repository';
import { RefreshTokenUseCase } from './application/use-cases/auth/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/auth/logout.use-case';
import { ChangeInitialPasswordUseCase } from './application/use-cases/auth/change-initial-password.use-case';
import { ExchangeRateService } from './infrastructure/finance/exchange-rate.service';
import { BcvCronService } from './infrastructure/finance/bcv-cron.service';
import { JwtStrategy } from './infrastructure/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/auth/guards/jwt-auth.guard';
import { Provider } from './domain/entities/provider.entity';
import { Client } from './domain/entities/client.entity';
import { ProviderRepository } from './infrastructure/persistence/typeorm/repositories/provider.repository';
import { ClientRepository } from './infrastructure/persistence/typeorm/repositories/client.repository';
import { ProvidersController } from './presentation/web/controllers/providers.controller';
import { ClientsController } from './presentation/web/controllers/clients.controller';
import { BankAccount } from './domain/entities/bank-account.entity';
import { BankMovement } from './domain/entities/bank-movement.entity';
import { BankAccountRepository } from './infrastructure/persistence/typeorm/repositories/bank-account.repository';
import { BankAccountsController } from './presentation/web/controllers/bank-accounts.controller';
import { Category } from './domain/entities/category.entity';
import { CategoryRepository } from './infrastructure/persistence/typeorm/repositories/category.repository';
import { CategoriesController } from './presentation/web/controllers/categories.controller';
import { WarehouseLocation } from './domain/entities/warehouse-location.entity';
import { WarehouseLocationsController } from './presentation/web/controllers/warehouse-locations.controller';
import { ProductBatch } from './domain/entities/product-batch.entity';
import { StockBalance } from './domain/entities/stock-balance.entity';
import { TenantFiscalRange } from './domain/entities/tenant-fiscal-range.entity';
import { SalesFiscalNote } from './domain/entities/sales-fiscal-note.entity';
import { SalesFiscalNoteItem } from './domain/entities/sales-fiscal-note-item.entity';
import { PurchaseFiscalNote } from './domain/entities/purchase-fiscal-note.entity';
import { PurchaseFiscalNoteItem } from './domain/entities/purchase-fiscal-note-item.entity';
import { FiscalAuditLog } from './domain/entities/fiscal-audit-log.entity';

import { TenantFiscalRangeRepository } from './infrastructure/persistence/typeorm/repositories/tenant-fiscal-range.repository';
import { SalesFiscalNoteRepository } from './infrastructure/persistence/typeorm/repositories/sales-fiscal-note.repository';
import { PurchaseFiscalNoteRepository } from './infrastructure/persistence/typeorm/repositories/purchase-fiscal-note.repository';

import { UsersController } from './presentation/web/controllers/users.controller';
import { CreateUserUseCase } from './application/use-cases/user/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/user/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/user/update-user.use-case';

import { Role } from './domain/entities/role.entity';
import { RolesController } from './presentation/web/controllers/roles.controller';
import { CreateRoleUseCase } from './application/use-cases/role/create-role.use-case';
import { ListRolesUseCase } from './application/use-cases/role/list-roles.use-case';
import { RoleRepository } from './infrastructure/persistence/typeorm/repositories/role.repository';

import { AccountReceivablePayable } from './domain/entities/account-receivable-payable.entity';
import { AccountReceivable } from './domain/entities/account-receivable.entity';
import { AccountPayable } from './domain/entities/account-payable.entity';
import { AccountPayment } from './domain/entities/account-payment.entity';
import { AccountReceivablePayableRepository } from './infrastructure/persistence/typeorm/repositories/account-receivable-payable.repository';
import { AccountReceivableRepository } from './infrastructure/persistence/typeorm/repositories/account-receivable.repository';
import { AccountPayableRepository } from './infrastructure/persistence/typeorm/repositories/account-payable.repository';
import { AccountsController } from './presentation/web/controllers/accounts.controller';
import { CreateAccountUseCase } from './application/use-cases/account/create-account.use-case';
import { RegisterPaymentUseCase } from './application/use-cases/account/register-payment.use-case';
import { BulkImportAccountsUseCase } from './application/use-cases/account/bulk-import-accounts.use-case';

import { StockSnapshot } from './domain/entities/stock-snapshot.entity';
import { StockSnapshotRepository } from './infrastructure/persistence/typeorm/repositories/stock-snapshot.repository';
import { StockSnapshotService } from './application/services/stock-snapshot.service';

import { CommercialDocument } from './domain/entities/commercial-document.entity';
import { CommercialDocumentItem } from './domain/entities/commercial-document-item.entity';
import { CommercialDocumentRepository } from './infrastructure/persistence/typeorm/repositories/commercial-document.repository';
import { CreateCommercialDocumentUseCase } from './application/use-cases/sales/create-commercial-document.use-case';
import { ConvertCommercialDocumentUseCase } from './application/use-cases/sales/convert-commercial-document.use-case';
import { CommercialDocumentsController } from './presentation/web/controllers/commercial-documents.controller';

import { PurchaseOrder, PurchaseOrderItem } from './domain/entities/purchase-order.entity';
import { PurchaseReceptionNote, PurchaseReceptionItem, PurchaseReceptionItemSerial } from './domain/entities/purchase-reception.entity';
import { ProductCostHistory } from './domain/entities/product-cost-history.entity';
import { SalePayment } from './domain/entities/sale-payment.entity';
import { CashShift } from './domain/entities/cash-shift.entity';
import { CreatePurchaseOrderUseCase } from './application/use-cases/purchases/create-purchase-order.use-case';
import { CreatePurchaseReceptionUseCase } from './application/use-cases/purchases/create-purchase-reception.use-case';
import { CancelAndReplacePurchaseOrderUseCase } from './application/use-cases/purchases/cancel-and-replace-purchase-order.use-case';
import { BulkUpdatePricesUseCase } from './application/use-cases/inventory/bulk-update-prices.use-case';
import { PurchasesController } from './presentation/web/controllers/purchases.controller';
import { SuperAdminController } from './presentation/web/controllers/super-admin.controller';
import { SaasPlan } from './domain/entities/saas-plan.entity';
import { SaasPlanManagementUseCase } from './application/use-cases/admin/saas-plan-management.use-case';

import { SubscriptionPaymentReceipt } from './domain/entities/subscription-payment-receipt.entity';
import { SubscriptionController } from './presentation/web/controllers/subscription.controller';
import { RegisterSubscriptionPaymentUseCase } from './application/use-cases/subscription/register-subscription-payment.use-case';
import { ApproveSubscriptionPaymentUseCase } from './application/use-cases/admin/approve-subscription-payment.use-case';

import { SystemSetting } from './domain/entities/system-setting.entity';
import { ExchangeRateHistory } from './domain/entities/exchange-rate-history.entity';
import { SystemSettingRepository } from './infrastructure/persistence/typeorm/repositories/system-setting.repository';
import { ExchangeRateHistoryRepository } from './infrastructure/persistence/typeorm/repositories/exchange-rate-history.repository';

import { FileUploadController } from './presentation/web/controllers/file-upload.controller';
import { UploadImageUseCase } from './application/use-cases/file/upload-image.use-case';
import { S3Service } from './infrastructure/storage/s3-service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [User, Tenant, Product, StockMove, PasswordResetToken, RefreshToken, PurchaseInvoice, PurchaseItem, Sale, SaleItem, Provider, Client, BankAccount, BankMovement, Category, WarehouseLocation, ProductBatch, StockBalance, TenantFiscalRange, SalesFiscalNote, SalesFiscalNoteItem, PurchaseFiscalNote, PurchaseFiscalNoteItem, FiscalAuditLog, Role, AccountReceivablePayable, AccountReceivable, AccountPayable, AccountPayment, StockSnapshot, CommercialDocument, CommercialDocumentItem, PurchaseOrder, PurchaseOrderItem, PurchaseReceptionNote, PurchaseReceptionItem, PurchaseReceptionItemSerial, ProductCostHistory, SalePayment, CashShift, SaasPlan, SubscriptionPaymentReceipt, SystemSetting, ExchangeRateHistory],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Tenant, Product, StockMove, PasswordResetToken, RefreshToken, PurchaseInvoice, PurchaseItem, Sale, SaleItem, Provider, Client, BankAccount, BankMovement, Category, WarehouseLocation, ProductBatch, StockBalance, TenantFiscalRange, SalesFiscalNote, SalesFiscalNoteItem, PurchaseFiscalNote, PurchaseFiscalNoteItem, FiscalAuditLog, Role, AccountReceivablePayable, AccountReceivable, AccountPayable, AccountPayment, StockSnapshot, CommercialDocument, CommercialDocumentItem, PurchaseOrder, PurchaseOrderItem, PurchaseReceptionNote, PurchaseReceptionItem, PurchaseReceptionItemSerial, ProductCostHistory, SalePayment, CashShift, SaasPlan, SubscriptionPaymentReceipt, SystemSetting, ExchangeRateHistory]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100, // General limit: 100 requests per minute
      },
    ]),
  ],
  controllers: [InventoryController, AuthController, CommercialDocumentsController, SalesController, CashShiftsController, ProvidersController, ClientsController, BankAccountsController, CategoriesController, WarehouseLocationsController, FiscalRangesController, TenantProfileController, UsersController, RolesController, AccountsController, PurchasesController, SuperAdminController, SubscriptionController, FileUploadController],
  providers: [
    BulkUploadProductsUseCase,
    RegisterPurchaseUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    CreateSaleUseCase,
    OpenShiftUseCase,
    GetActiveShiftUseCase,
    CloseShiftUseCase,
    ApproveShiftUseCase,
    EmitSalesNoteUseCase,
    RegisterPurchaseNoteUseCase,
    LoginUseCase,
    RegisterTenantUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ChangeInitialPasswordUseCase,
    GetFiscalRangesUseCase,
    ConfigureFiscalRangeUseCase,
    GetCompanyProfileUseCase,
    UpdateCompanyProfileUseCase,
    CreatePurchaseOrderUseCase,
    CreatePurchaseReceptionUseCase,
    BulkUpdatePricesUseCase,
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ExchangeRateService,
    BcvCronService,
    SystemSettingRepository,
    ExchangeRateHistoryRepository,
    SaasPlanManagementUseCase,
    RegisterSubscriptionPaymentUseCase,
    ApproveSubscriptionPaymentUseCase,
    UploadImageUseCase,
    S3Service,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // In NestJS with TypeORM, we can inject repositories directly or wrap them
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    TenantRepository,
    ProductRepository,
    StockMoveRepository,
    CreateStockAdjustmentUseCase,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    PurchaseInvoiceRepository,
    SaleRepository,
    SalePaymentRepository,
    CashShiftRepository,
    ProviderRepository,
    ClientRepository,
    BankAccountRepository,
    CategoryRepository,
    TenantFiscalRangeRepository,
    SalesFiscalNoteRepository,
    PurchaseFiscalNoteRepository,
    RoleRepository,
    CreateRoleUseCase,
    ListRolesUseCase,
    CreateUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    AccountReceivablePayableRepository,
    AccountReceivableRepository,
    AccountPayableRepository,
    CreateAccountUseCase,
    RegisterPaymentUseCase,
    BulkImportAccountsUseCase,
    StockSnapshotService,
    StockSnapshotRepository,
    CreateCommercialDocumentUseCase,
    ConvertCommercialDocumentUseCase,
    CommercialDocumentRepository,
    CreatePurchaseOrderUseCase,
    CreatePurchaseReceptionUseCase,
    CancelAndReplacePurchaseOrderUseCase,
    BulkUpdatePricesUseCase,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      const candidates = [
        path.join(process.cwd(), 'src', 'infrastructure', 'persistence', 'typeorm', 'migrations'),
        path.join(__dirname, 'infrastructure', 'persistence', 'typeorm', 'migrations'),
        path.join(process.cwd(), 'dist', 'src', 'infrastructure', 'persistence', 'typeorm', 'migrations'),
      ];

      const migrationsDir = candidates.find(dir => fs.existsSync(dir));

      if (migrationsDir) {
        const files = fs.readdirSync(migrationsDir)
          .filter(f => f.endsWith('.sql'))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        for (const file of files) {
          const filePath = path.join(migrationsDir, file);
          const sql = fs.readFileSync(filePath, 'utf8');
          if (sql && sql.trim().length > 0) {
            try {
              await this.dataSource.query(sql);
            } catch (err) {
              // Ignore table already exists or column already exists notices
            }
          }
        }
      }

      // Explicitly reset Super Admin password to Admin123! and reset failed login attempts
      const freshHash = '$2b$10$OYoQuEEAKNFaVkibHRfGWuHOd40bdM9wRw1Bv.55JwGpXxpENdy7y'; // bcrypt hash for Admin123!
      await this.dataSource.query(`
        UPDATE users 
        SET password_hash = '${freshHash}',
            is_active = true,
            failed_login_attempts = 0
        WHERE email IN ('superadmin@ari.com', 'admin@ari.com', 'alutechnology@gmail.com');
      `);
      console.log('✅ Passwords for superadmin@ari.com, admin@ari.com and alutechnology@gmail.com explicitly reset to Admin123!');
    } catch (err) {
      console.warn('Notice running SQL migrations or resetting password on startup:', err);
    }
  }
}
