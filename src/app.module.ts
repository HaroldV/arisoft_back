import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { InventoryController } from './presentation/web/controllers/inventory.controller';
import { AuthController } from './presentation/web/controllers/auth.controller';
import { SalesController } from './presentation/web/controllers/sales.controller';
import { BulkUploadProductsUseCase } from './application/use-cases/inventory/bulk-upload-products.use-case';
import { RegisterPurchaseUseCase } from './application/use-cases/inventory/register-purchase.use-case';
import { UpdateProductUseCase } from './application/use-cases/inventory/update-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/inventory/delete-product.use-case';
import { CreateSaleUseCase } from './application/use-cases/pos/create-sale.use-case';
import { LoginUseCase } from './application/use-cases/auth/login.use-case';
import { RegisterTenantUseCase } from './application/use-cases/tenant/register-tenant.use-case';
import { ProductRepository } from './infrastructure/persistence/postgresql/repositories/product.repository';
import { StockMoveRepository } from './infrastructure/persistence/postgresql/repositories/stock-move.repository';
import { UserRepository } from './infrastructure/persistence/postgresql/repositories/user.repository';
import { TenantRepository } from './infrastructure/persistence/postgresql/repositories/tenant.repository';
import { PurchaseInvoiceRepository } from './infrastructure/persistence/postgresql/repositories/purchase-invoice.repository';
import { SaleRepository } from './infrastructure/persistence/postgresql/repositories/sale.repository';
import { AuthService } from './application/use-cases/auth/auth.service';
import { User } from './domain/entities/user.entity';
import { Tenant } from './domain/entities/tenant.entity';
import { Product } from './domain/entities/product.entity';
import { StockMove } from './domain/entities/stock-move.entity';
import { PurchaseInvoice } from './domain/entities/purchase-invoice.entity';
import { PurchaseItem } from './domain/entities/purchase-item.entity';
import { Sale } from './domain/entities/sale.entity';
import { SaleItem } from './domain/entities/sale-item.entity';
import { ForgotPasswordUseCase } from './application/use-cases/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/auth/reset-password.use-case';
import { PasswordResetTokenRepository } from './infrastructure/persistence/postgresql/repositories/password-reset-token.repository';
import { PasswordResetToken } from './domain/entities/password-reset-token.entity';
import { RefreshToken } from './domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from './infrastructure/persistence/postgresql/repositories/refresh-token.repository';
import { RefreshTokenUseCase } from './application/use-cases/auth/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/auth/logout.use-case';
import { JwtStrategy } from './infrastructure/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/auth/guards/jwt-auth.guard';

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
        entities: [User, Tenant, Product, StockMove, PasswordResetToken, RefreshToken, PurchaseInvoice, PurchaseItem, Sale, SaleItem],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Tenant, Product, StockMove, PasswordResetToken, RefreshToken, PurchaseInvoice, PurchaseItem, Sale, SaleItem]),
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
  controllers: [InventoryController, AuthController, SalesController],
  providers: [
    BulkUploadProductsUseCase,
    RegisterPurchaseUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    CreateSaleUseCase,
    LoginUseCase,
    RegisterTenantUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
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
    PasswordResetTokenRepository,
    RefreshTokenRepository,
    PurchaseInvoiceRepository,
    SaleRepository,
  ],
})
export class AppModule {}
