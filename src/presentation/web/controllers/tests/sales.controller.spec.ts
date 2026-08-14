import { SalesController } from '../sales.controller';
import { CreateSaleUseCase } from '../../../../application/use-cases/pos/create-sale.use-case';
import { SaleRepository } from '../../../../infrastructure/persistence/typeorm/repositories/sale.repository';
import { NotFoundException } from '@nestjs/common';

describe('SalesController', () => {
  let controller: SalesController;
  let createSaleUseCase: CreateSaleUseCase;
  let saleRepo: jest.Mocked<SaleRepository>;

  beforeEach(() => {
    createSaleUseCase = { execute: jest.fn() } as any;
    const emitSalesNoteUseCase = { execute: jest.fn() } as any;
    saleRepo = {
      findSalesWithCashier: jest.fn(),
      findSaleDetails: jest.fn(),
    } as any;
    const salesFiscalNoteRepo = {
      findNotesList: jest.fn(),
      findNoteDetails: jest.fn(),
    } as any;
    controller = new SalesController(createSaleUseCase, emitSalesNoteUseCase, saleRepo, salesFiscalNoteRepo);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findSalesWithCashier when getting sales', async () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        tenant_id: tenantId,
      },
    };

    saleRepo.findSalesWithCashier.mockResolvedValue([]);

    await controller.getSales(tenantId, mockRequest as any);

    expect(saleRepo.findSalesWithCashier).toHaveBeenCalled();
  });

  it('should call findSaleDetails when getting sale details', async () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        tenant_id: tenantId,
      },
    };
    const validUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

    saleRepo.findSaleDetails.mockResolvedValue({ id: validUuid } as any);

    const result = await controller.getSaleDetails(validUuid, tenantId, mockRequest as any);

    expect(saleRepo.findSaleDetails).toHaveBeenCalledWith(validUuid);
    expect(result).toEqual({ id: validUuid });
  });

  it('should throw NotFoundException when sale details do not exist', async () => {
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        tenant_id: tenantId,
      },
    };
    const validUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

    saleRepo.findSaleDetails.mockResolvedValue(null);

    await expect(
      controller.getSaleDetails(validUuid, tenantId, mockRequest as any)
    ).rejects.toThrow(NotFoundException);
  });

  it('should call execute on createSaleUseCase when creating a sale', async () => {
    const dto = {
      exchangeRateApplied: 1.0,
      negativeStockJustification: 'No justification',
      items: [
        { productId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', quantity: 5 },
      ],
    };
    const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockRequest = {
      user: {
        userId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        tenant_id: tenantId,
      },
    };

    await controller.createSale(tenantId, dto, mockRequest as any);

    expect(createSaleUseCase.execute).toHaveBeenCalledWith(
      tenantId,
      {
        id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        role: undefined,
        permissions: [],
      },
      dto,
    );
  });
});
