import { Test, TestingModule } from '@nestjs/testing';
import { CommercialDocumentsController } from '../commercial-documents.controller';
import { CommercialDocumentRepository } from '../../../../infrastructure/persistence/typeorm/repositories/commercial-document.repository';
import { CreateCommercialDocumentUseCase } from '../../../../application/use-cases/sales/create-commercial-document.use-case';
import { ConvertCommercialDocumentUseCase } from '../../../../application/use-cases/sales/convert-commercial-document.use-case';
import { CommercialDocumentType } from '../../../../domain/entities/commercial-document.entity';

describe('CommercialDocumentsController User Scoping', () => {
  let controller: CommercialDocumentsController;
  let repo: Partial<CommercialDocumentRepository>;
  let createUseCase: Partial<CreateCommercialDocumentUseCase>;
  let convertUseCase: Partial<ConvertCommercialDocumentUseCase>;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(async () => {
    repo = {
      findByType: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      save: jest.fn(),
      generateNextNumber: jest.fn(),
    };
    createUseCase = { execute: jest.fn() };
    convertUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommercialDocumentsController],
      providers: [
        { provide: CommercialDocumentRepository, useValue: repo },
        { provide: CreateCommercialDocumentUseCase, useValue: createUseCase },
        { provide: ConvertCommercialDocumentUseCase, useValue: convertUseCase },
      ],
    }).compile();

    controller = module.get<CommercialDocumentsController>(CommercialDocumentsController);
  });

  it('should pass userId filter when requesting user is a SELLER/Vendedor', async () => {
    const req = {
      user: {
        tenant_id: tenantId,
        sub: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        role: 'SELLER',
      },
    };

    await controller.getDocuments(tenantId, CommercialDocumentType.QUOTATION, '', req);

    expect(repo.findByType).toHaveBeenCalledWith(
      tenantId,
      CommercialDocumentType.QUOTATION,
      '',
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    );
  });

  it('should NOT pass userId filter when requesting user is OWNER or ADMIN', async () => {
    const req = {
      user: {
        tenant_id: tenantId,
        sub: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        role: 'OWNER',
      },
    };

    await controller.getDocuments(tenantId, CommercialDocumentType.QUOTATION, '', req);

    expect(repo.findByType).toHaveBeenCalledWith(
      tenantId,
      CommercialDocumentType.QUOTATION,
      '',
      undefined,
    );
  });
});
