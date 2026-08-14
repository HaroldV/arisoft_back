import { ConvertCommercialDocumentUseCase } from './convert-commercial-document.use-case';
import { CommercialDocumentType, DocumentStatus } from '../../../domain/entities/commercial-document.entity';
import { StockMoveType } from '../../../domain/entities/stock-move.entity';

describe('ConvertCommercialDocumentUseCase Performance & Data Propagation', () => {
  let useCase: ConvertCommercialDocumentUseCase;
  let mockDocRepo: any;
  let mockCreateUseCase: any;
  let mockStockMoveRepo: any;

  beforeEach(() => {
    mockDocRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    mockCreateUseCase = {
      execute: jest.fn(),
    };
    mockStockMoveRepo = {
      create: jest.fn((val) => val),
      save: jest.fn().mockResolvedValue(true),
    };

    useCase = new ConvertCommercialDocumentUseCase(
      mockDocRepo,
      mockCreateUseCase,
      mockStockMoveRepo,
    );
  });

  it('should propagate issue_date, valid_until, and payment_method swiftly when converting a quotation', async () => {
    const startTime = Date.now();

    const sourceDoc = {
      id: 'doc-123',
      tenant_id: 'tenant-abc',
      document_type: CommercialDocumentType.QUOTATION,
      document_number: 'COT-2026-0001',
      client_id: 'client-1',
      client_name: 'Cliente Test',
      client_tax_id: 'J-12345678-9',
      issue_date: '2026-07-31',
      valid_until: '2026-08-15',
      payment_method: 'ZELLE',
      exchange_rate: 36.5,
      status: DocumentStatus.SENT,
      items: [
        {
          product_id: 'prod-1',
          product_name: 'Harina de Trigo',
          sku: 'PROD-001',
          unit_price_usd: '2.50',
          quantity: '10',
        },
      ],
    };

    mockDocRepo.findById.mockResolvedValue(sourceDoc);
    mockCreateUseCase.execute.mockResolvedValue({
      id: 'new-doc-456',
      document_number: 'PED-2026-0001',
      document_type: CommercialDocumentType.SALES_ORDER,
      status: DocumentStatus.APPROVED,
    });

    const result = await useCase.execute(
      'tenant-abc',
      'doc-123',
      CommercialDocumentType.SALES_ORDER,
      { id: 'user-1', name: 'Admin' },
    );

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100); // Execution should be under 100ms
    expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
      'tenant-abc',
      expect.objectContaining({
        document_type: CommercialDocumentType.SALES_ORDER,
        issue_date: '2026-07-31',
        valid_until: '2026-08-15',
        payment_method: 'ZELLE',
        client_name: 'Cliente Test',
      }),
      { id: 'user-1', name: 'Admin' },
    );
    expect(sourceDoc.status).toBe(DocumentStatus.CONVERTED);
    expect(result.document_number).toBe('PED-2026-0001');
  });
});
