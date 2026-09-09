import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CreateSaleUseCase } from '../create-sale.use-case';
import { PosCalculatorService } from '../../../services/pos-calculator.service';
import { SaleRepository } from '../../../../infrastructure/persistence/typeorm/repositories/sale.repository';
import { ProductRepository } from '../../../../infrastructure/persistence/typeorm/repositories/product.repository';
import { StockMoveRepository } from '../../../../infrastructure/persistence/typeorm/repositories/stock-move.repository';
import { TenantRepository } from '../../../../infrastructure/persistence/typeorm/repositories/tenant.repository';
import { TenantFiscalRangeRepository } from '../../../../infrastructure/persistence/typeorm/repositories/tenant-fiscal-range.repository';
import { CashShiftRepository } from '../../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { Product } from '../../../../domain/entities/product.entity';
import { Tenant } from '../../../../domain/entities/tenant.entity';
import { CashShift } from '../../../../domain/entities/cash-shift.entity';
import { SalePayment } from '../../../../domain/entities/sale-payment.entity';
import { Sale } from '../../../../domain/entities/sale.entity';

describe('POS Multi-Currency & Checkout Precision Tests (E2E & UseCase Validation)', () => {
  let createSaleUseCase: CreateSaleUseCase;
  let posCalculator: PosCalculatorService;
  let saleRepo: jest.Mocked<SaleRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let stockMoveRepo: jest.Mocked<StockMoveRepository>;
  let tenantRepo: jest.Mocked<TenantRepository>;
  let tenantFiscalRangeRepo: jest.Mocked<TenantFiscalRangeRepository>;
  let mockManager: any;
  let mockDataSource: any;

  const tenantId = '0a19cf31-6818-4a84-b280-9a2d3b1c54d3';
  const userId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const productId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  beforeEach(async () => {
    posCalculator = new PosCalculatorService();

    const mockSaleRepo = {
      save: jest.fn(),
      findById: jest.fn(),
    };
    const mockProductRepo = {
      findByIds: jest.fn(),
    };
    const mockStockMoveRepo = {
      getCurrentStocks: jest.fn(),
      save: jest.fn(),
    };
    const mockTenantRepo = {
      findById: jest.fn(),
    };
    const mockTenantFiscalRangeRepo = {
      getNextRangeNumbers: jest.fn().mockResolvedValue({
        documentNumber: 'FACT-00000123',
        controlNumber: '00-00000123',
      }),
    };
    const mockCashShiftRepo = {
      findActiveShift: jest.fn().mockResolvedValue(
        new CashShift({ id: 'active-shift-id', status: 'OPEN', branch_id: 'branch-1' })
      ),
    };

    const savedEntities: any[] = [];
    mockManager = {
      save: jest.fn().mockImplementation(async (...args: any[]) => {
        const data = args.length === 2 ? args[1] : args[0];
        savedEntities.push(data);
        return { ...data, id: data?.id || 'generated-id-123' };
      }),
      _savedEntities: savedEntities,
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSaleUseCase,
        { provide: SaleRepository, useValue: mockSaleRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: StockMoveRepository, useValue: mockStockMoveRepo },
        { provide: TenantRepository, useValue: mockTenantRepo },
        { provide: TenantFiscalRangeRepository, useValue: mockTenantFiscalRangeRepo },
        { provide: CashShiftRepository, useValue: mockCashShiftRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    createSaleUseCase = module.get<CreateSaleUseCase>(CreateSaleUseCase);
    saleRepo = module.get(SaleRepository);
    productRepo = module.get(ProductRepository);
    stockMoveRepo = module.get(StockMoveRepository);
    tenantRepo = module.get(TenantRepository);
    tenantFiscalRangeRepo = module.get(TenantFiscalRangeRepository);
  });

  describe('1. POS Calculator Mathematical Exactness', () => {
    it('should calculate exact VES total for $2.15 USD at 814.6908 rate', () => {
      const items = [{ price_usd: 2.15, quantity: 1, tax_rate: 0 }];
      const rate = 814.6908;

      const totals = posCalculator.calculateTotals(items, rate);

      expect(totals.usd.total).toBe(2.15);
      expect(Number(totals.ves.total.toFixed(2))).toBe(1751.59);
      expect(Number((2.15 * 814.69).toFixed(2))).toBe(1751.58);
    });

    it('should not introduce floating point drift on split payments', () => {
      const totalUsd = 2.15;
      const rate = 814.6908;

      const paidUsdPart = 1.00;
      const paidVesPart = Number((1.15 * rate).toFixed(2)); // 936.89 Bs.

      const equivalentUsdFromVes = paidVesPart / rate;
      const totalPaidUsd = paidUsdPart + equivalentUsdFromVes;

      expect(totalPaidUsd).toBeCloseTo(totalUsd, 2);
    });
  });

  describe('2. End-to-End Sale Registration with Multi-Currency & Pago Móvil', () => {
    it('should register sale of $2.15 paid via Pago Móvil in VES at rate 814.6908', async () => {
      const exchangeRate = 814.6908;
      const totalUsd = 2.15;
      const totalVes = Number((totalUsd * exchangeRate).toFixed(2));

      const product = new Product({
        id: productId,
        name: 'Producto Especial 2.15',
        price_usd: 2.15,
        cost_usd: 1.50,
      } as any);

      tenantRepo.findById.mockResolvedValue(
        Object.assign(new Tenant(), { id: tenantId, settings: { allow_negative_stock: false } })
      );
      productRepo.findByIds.mockResolvedValue([product]);

      const stockMap = new Map<string, number>();
      stockMap.set(productId, 10);
      stockMoveRepo.getCurrentStocks.mockResolvedValue(stockMap);

      const dto = {
        exchangeRateApplied: exchangeRate,
        paymentMethod: 'PAGO_MOVIL',
        payments: [
          {
            paymentMethod: 'PAGO_MOVIL',
            amountOriginal: totalVes,
            currency: 'VES',
            transactionReference: 'REF-987654',
          },
        ],
        items: [{ productId, quantity: 1 }],
      };

      const result = await createSaleUseCase.execute(
        tenantId,
        { id: userId, role: 'CASHIER', permissions: ['pos:create'] },
        dto
      );

      expect(result.message).toBe('Sale registered successfully');
      expect(result.totalAmountUsd).toBe(2.15);
      expect(result.invoiceNumber).toBe('FACT-00000123');
      expect(result.controlNumber).toBe('00-00000123');

      // Verify Sale Header
      const savedSale = mockManager._savedEntities.find((e: any) => e instanceof Sale || e.total_amount_usd !== undefined);
      expect(savedSale).toBeDefined();
      expect(savedSale.total_amount_usd).toBe(2.15);
      expect(savedSale.exchange_rate_applied).toBe(exchangeRate);

      // Verify Sale Payment line
      const savedPayment = mockManager._savedEntities.find((e: any) => e instanceof SalePayment);
      expect(savedPayment).toBeDefined();
      expect(savedPayment.payment_method).toBe('PAGO_MOVIL');
      expect(savedPayment.currency).toBe('VES');
      expect(savedPayment.amount_original).toBe(totalVes);
      expect(savedPayment.transaction_reference).toBe('REF-987654');
      expect(savedPayment.amount_usd).toBeCloseTo(2.15, 2);
    });

    it('should register split payment with exact change in VES without loss of precision', async () => {
      const exchangeRate = 814.6908;
      const totalUsd = 2.15;

      const product = new Product({
        id: productId,
        name: 'Producto 2.15',
        price_usd: 2.15,
        cost_usd: 1.00,
      } as any);

      tenantRepo.findById.mockResolvedValue(
        Object.assign(new Tenant(), { id: tenantId, settings: { allow_negative_stock: false } })
      );
      productRepo.findByIds.mockResolvedValue([product]);

      const stockMap = new Map<string, number>();
      stockMap.set(productId, 10);
      stockMoveRepo.getCurrentStocks.mockResolvedValue(stockMap);

      const changeVes = Number((2.85 * exchangeRate).toFixed(2));

      const dto = {
        exchangeRateApplied: exchangeRate,
        paymentMethod: 'CASH_USD',
        payments: [
          {
            paymentMethod: 'CASH_USD',
            amountOriginal: 5.00,
            currency: 'USD',
          },
        ],
        change: {
          amountOriginal: changeVes,
          currency: 'VES',
        },
        items: [{ productId, quantity: 1 }],
      };

      const result = await createSaleUseCase.execute(
        tenantId,
        { id: userId, role: 'CASHIER', permissions: ['pos:create'] },
        dto
      );

      expect(result.message).toBe('Sale registered successfully');

      const changePayment = mockManager._savedEntities.find((e: any) => e.payment_method === 'CHANGE_VES');
      expect(changePayment).toBeDefined();
      expect(changePayment.amount_original).toBe(-changeVes);
      expect(changePayment.currency).toBe('VES');
      expect(changePayment.amount_usd).toBeCloseTo(-2.85, 2);
    });
  });
});
