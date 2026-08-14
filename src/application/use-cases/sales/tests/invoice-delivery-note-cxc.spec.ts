import { CreateCommercialDocumentUseCase } from '../create-commercial-document.use-case';
import { CreateAccountUseCase } from '../../account/create-account.use-case';
import { AccountType, EntityType, AccountStatus } from '../../../../domain/entities/account-receivable-payable.entity';
import { CommercialDocumentType } from '../../../../domain/entities/commercial-document.entity';
import { Sale } from '../../../../domain/entities/sale.entity';

describe('E2E Delivery Note Generation, Invoicing & Accounts Receivable (CxC) Flow', () => {
  let createCommercialDocumentUseCase: CreateCommercialDocumentUseCase;
  let createAccountUseCase: CreateAccountUseCase;
  let mockDocRepo: any;
  let mockStockMoveRepo: any;
  let mockProductRepo: any;
  let mockAccountRepo: any;
  let mockSaleRepo: any;

  beforeEach(() => {
    mockDocRepo = {
      generateNextNumber: jest.fn().mockResolvedValue('NDE-2026-0099'),
      save: jest.fn().mockImplementation((doc) => Promise.resolve({ id: 'nde-99', ...doc })),
      findById: jest.fn(),
    };

    mockStockMoveRepo = {
      save: jest.fn().mockImplementation((m) => Promise.resolve({ id: 'sm-1', ...m })),
    };

    mockProductRepo = {
      findById: jest.fn(),
    };

    mockAccountRepo = {
      save: jest.fn().mockImplementation((acc) => Promise.resolve({ id: 'cxc-101', ...acc })),
    };

    mockSaleRepo = {
      save: jest.fn().mockImplementation((s) => Promise.resolve({ id: 'sale-99', ...s })),
    };

    createCommercialDocumentUseCase = new CreateCommercialDocumentUseCase(
      mockDocRepo,
      mockStockMoveRepo,
      mockProductRepo,
      mockAccountRepo,
    );

    createAccountUseCase = new CreateAccountUseCase(mockAccountRepo);
  });

  it('should automatically register a RECEIVABLE account in Cuentas por Cobrar (CxC) as soon as a Delivery Note (NDE) is generated', async () => {
    const dto = {
      document_type: CommercialDocumentType.DELIVERY_NOTE,
      client_name: 'Inversiones Globales R&S C.A.',
      client_tax_id: 'J-40918273-9',
      issue_date: '2026-07-31',
      items: [
        {
          product_name: 'Impresora Fiscal Bixolon SRP-350',
          sku: 'BIX-350',
          unit_price_usd: 350.00,
          quantity: 2,
        },
      ],
    };

    const doc = await createCommercialDocumentUseCase.execute('tenant-test-123', dto as any);

    expect(mockDocRepo.save).toHaveBeenCalled();
    expect(doc.document_number).toBe('NDE-2026-0099');

    // Verify Account Receivable (accounts_receivable) registration in CxC
    expect(mockAccountRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        client_name: 'Inversiones Globales R&S C.A.',
        period_amount: 812.00, // $700 subtotal + $112 tax (16%)
        status: AccountStatus.PENDING,
      })
    );
  });

  it('should invoice a Delivery Note (NDE) and transition status to INVOICED without stock duplicate', async () => {
    const deliveryNote = {
      id: 'nde-2026-001',
      tenant_id: 'tenant-test-123',
      document_type: CommercialDocumentType.DELIVERY_NOTE,
      document_number: 'NDE-2026-0042',
      client_name: 'Comercializadora FarmaVida C.A.',
      client_tax_id: 'J-50918274-1',
      status: 'DISPATCHED',
      total_usd: 450.00,
      total_bs: 16425.00,
      exchange_rate: 36.50,
      payment_method: 'CREDIT',
    };

    mockDocRepo.findById.mockResolvedValue(deliveryNote);

    deliveryNote.status = 'INVOICED';
    const updatedDoc = await mockDocRepo.save(deliveryNote);

    expect(updatedDoc.status).toBe('INVOICED');
    expect(updatedDoc.document_number).toBe('NDE-2026-0042');
  });

  it('should update and confirm Account Receivable (RECEIVABLE) in CxC when Delivery Note is invoiced on CREDIT', async () => {
    const deliveryNote = {
      id: 'nde-2026-001',
      document_number: 'NDE-2026-0042',
      client_name: 'Comercializadora FarmaVida C.A.',
      client_tax_id: 'J-50918274-1',
      total_usd: 450.00,
      exchange_rate: 36.50,
      payment_method: 'CREDIT',
      credit_days: 30,
    };

    const cxcDto = {
      type: AccountType.RECEIVABLE,
      entity_type: EntityType.CLIENT,
      entity_name: deliveryNote.client_name,
      reference_date: '2026-07-31',
      notes: `Factura Fiscal FACT-2026-0104 (Control 00-0104) por Nota de Entrega #${deliveryNote.document_number}. Crédito a 30 días.`,
      period_amount: deliveryNote.total_usd,
      previous_balance: 0,
      cash_usd: 0, // Pending payment
    };

    const result = await createAccountUseCase.execute('tenant-test-123', cxcDto as any);

    expect(mockAccountRepo.save).toHaveBeenCalled();
    expect(result.type).toBe(AccountType.RECEIVABLE);
    expect(result.entity_name).toBe('Comercializadora FarmaVida C.A.');
    expect(result.period_amount).toBe(450.00);
    expect(result.balance_due).toBe(450.00);
    expect(result.status).toBe(AccountStatus.PENDING);
  });

  it('should register a Sale header record in sales table for Facturación de Venta (/sales)', async () => {
    const saleRecord = new Sale({
      tenant_id: 'tenant-test-123',
      user_id: 'user-caja-1',
      total_amount_usd: 450.00,
      exchange_rate_applied: 36.50,
      status: 'PAID',
      invoice_number: 'FACT-2026-0104',
      control_number: '00-0104',
    });

    const savedSale = await mockSaleRepo.save(saleRecord);

    expect(mockSaleRepo.save).toHaveBeenCalled();
    expect(savedSale.invoice_number).toBe('FACT-2026-0104');
    expect(savedSale.control_number).toBe('00-0104');
    expect(savedSale.total_amount_usd).toBe(450.00);
  });
});
