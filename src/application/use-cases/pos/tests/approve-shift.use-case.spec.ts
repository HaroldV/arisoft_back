import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApproveShiftUseCase } from '../approve-shift.use-case';
import { CashShiftRepository } from '../../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';
import { CashShift } from '../../../../domain/entities/cash-shift.entity';

describe('ApproveShiftUseCase', () => {
  let useCase: ApproveShiftUseCase;
  let cashShiftRepo: jest.Mocked<CashShiftRepository>;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const supervisorId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const shiftId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  beforeEach(async () => {
    const mockCashShiftRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveShiftUseCase,
        { provide: CashShiftRepository, useValue: mockCashShiftRepo },
      ],
    }).compile();

    useCase = module.get<ApproveShiftUseCase>(ApproveShiftUseCase);
    cashShiftRepo = module.get(CashShiftRepository);
  });

  it('should successfully approve shift if status is PENDING_APPROVAL', async () => {
    const pendingShift = new CashShift({
      id: shiftId,
      status: 'PENDING_APPROVAL',
      tenant_id: tenantId,
    });

    cashShiftRepo.findById.mockResolvedValue(pendingShift);
    cashShiftRepo.save.mockImplementation(async (shift) => shift);

    const result = await useCase.execute(tenantId, supervisorId, shiftId);

    expect(cashShiftRepo.findById).toHaveBeenCalledWith(shiftId);
    expect(cashShiftRepo.save).toHaveBeenCalled();
    expect(result.status).toBe('CLOSED');
    expect(result.approved_by_id).toBe(supervisorId);
  });

  it('should throw BadRequestException if shift status is not PENDING_APPROVAL', async () => {
    const openShift = new CashShift({
      id: shiftId,
      status: 'OPEN',
      tenant_id: tenantId,
    });

    cashShiftRepo.findById.mockResolvedValue(openShift);

    await expect(useCase.execute(tenantId, supervisorId, shiftId)).rejects.toThrow(
      BadRequestException,
    );

    expect(cashShiftRepo.save).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if shift is not found', async () => {
    cashShiftRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(tenantId, supervisorId, shiftId)).rejects.toThrow(
      NotFoundException,
    );

    expect(cashShiftRepo.save).not.toHaveBeenCalled();
  });
});
