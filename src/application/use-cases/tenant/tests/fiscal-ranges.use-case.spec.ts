import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConfigureFiscalRangeUseCase } from '../configure-fiscal-range.use-case';
import { GetFiscalRangesUseCase } from '../get-fiscal-ranges.use-case';
import { TenantFiscalRangeRepository } from '../../../../infrastructure/persistence/postgresql/repositories/tenant-fiscal-range.repository';
import { TenantFiscalRange } from '../../../../domain/entities/tenant-fiscal-range.entity';

describe('Fiscal Ranges Use Cases', () => {
  let configureUseCase: ConfigureFiscalRangeUseCase;
  let getUseCase: GetFiscalRangesUseCase;
  let mockRepo: jest.Mocked<TenantFiscalRangeRepository>;
  let mockManager: any;
  let mockDataSource: any;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(async () => {
    mockRepo = {
      findRanges: jest.fn(),
      save: jest.fn(),
    } as any;

    mockManager = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (entityClass, data) => data),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigureFiscalRangeUseCase,
        GetFiscalRangesUseCase,
        { provide: TenantFiscalRangeRepository, useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    configureUseCase = module.get<ConfigureFiscalRangeUseCase>(ConfigureFiscalRangeUseCase);
    getUseCase = module.get<GetFiscalRangesUseCase>(GetFiscalRangesUseCase);
  });

  describe('ConfigureFiscalRangeUseCase', () => {
    it('should configure a new range if it does not exist', async () => {
      const dto = {
        type: 'CREDIT_NOTE' as const,
        startNumber: 1,
        endNumber: 1000,
        currentNumber: 0,
        authorizationNumber: 'AUTH-123',
      };

      mockManager.findOne.mockResolvedValue(null);

      const result = await configureUseCase.execute(tenantId, dto);

      expect(mockManager.findOne).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalledWith(
        TenantFiscalRange,
        expect.objectContaining({
          tenant_id: tenantId,
          type: 'CREDIT_NOTE',
          start_number: 1,
          end_number: 1000,
          current_number: 0,
          authorization_number: 'AUTH-123',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should update range if it already exists', async () => {
      const dto = {
        type: 'INVOICE' as const,
        startNumber: 10,
        endNumber: 500,
        currentNumber: 15,
        authorizationNumber: 'AUTH-456',
      };

      const existingRange = new TenantFiscalRange({
        tenant_id: tenantId,
        type: 'INVOICE',
        start_number: 1,
        end_number: 100,
        current_number: 5,
        authorization_number: 'AUTH-111',
      });

      mockManager.findOne.mockResolvedValue(existingRange);

      await configureUseCase.execute(tenantId, dto);

      expect(existingRange.start_number).toBe(10);
      expect(existingRange.end_number).toBe(500);
      expect(existingRange.current_number).toBe(15);
      expect(existingRange.authorization_number).toBe('AUTH-456');
      expect(mockManager.save).toHaveBeenCalledWith(TenantFiscalRange, existingRange);
    });

    it('should throw BadRequestException if startNumber is greater or equal than endNumber', async () => {
      const dto = {
        type: 'CREDIT_NOTE' as const,
        startNumber: 1000,
        endNumber: 500,
        currentNumber: 0,
        authorizationNumber: 'AUTH-123',
      };

      await expect(configureUseCase.execute(tenantId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('GetFiscalRangesUseCase', () => {
    it('should call findRanges on the repository', async () => {
      const mockRanges = [
        new TenantFiscalRange({ tenant_id: tenantId, type: 'INVOICE' }),
        new TenantFiscalRange({ tenant_id: tenantId, type: 'CREDIT_NOTE' }),
      ];
      mockRepo.findRanges.mockResolvedValue(mockRanges);

      const result = await getUseCase.execute();

      expect(mockRepo.findRanges).toHaveBeenCalled();
      expect(result).toEqual(mockRanges);
    });
  });
});
