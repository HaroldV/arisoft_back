import { ForbiddenException } from '@nestjs/common';
import { CashShiftsController } from '../cash-shifts.controller';
import { OpenShiftUseCase } from '../../../../application/use-cases/pos/open-shift.use-case';
import { CloseShiftUseCase } from '../../../../application/use-cases/pos/close-shift.use-case';
import { GetActiveShiftUseCase } from '../../../../application/use-cases/pos/get-active-shift.use-case';
import { ApproveShiftUseCase } from '../../../../application/use-cases/pos/approve-shift.use-case';
import { CashShiftRepository } from '../../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';

describe('CashShiftsController', () => {
  let controller: CashShiftsController;
  let openShiftUseCase: jest.Mocked<OpenShiftUseCase>;
  let closeShiftUseCase: jest.Mocked<CloseShiftUseCase>;
  let getActiveShiftUseCase: jest.Mocked<GetActiveShiftUseCase>;
  let approveShiftUseCase: jest.Mocked<ApproveShiftUseCase>;
  let cashShiftRepo: jest.Mocked<CashShiftRepository>;

  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const userId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  beforeEach(() => {
    openShiftUseCase = { execute: jest.fn() } as any;
    closeShiftUseCase = { execute: jest.fn() } as any;
    getActiveShiftUseCase = { execute: jest.fn() } as any;
    approveShiftUseCase = { execute: jest.fn() } as any;
    cashShiftRepo = {
      findAllShifts: jest.fn(),
    } as any;

    controller = new CashShiftsController(
      openShiftUseCase,
      closeShiftUseCase,
      getActiveShiftUseCase,
      approveShiftUseCase,
      cashShiftRepo,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get active shift details for current user', async () => {
    const mockRequest = { user: { id: userId, tenant_id: tenantId } };
    getActiveShiftUseCase.execute.mockResolvedValue({ active: true } as any);

    const result = await controller.getActiveShift(mockRequest);

    expect(getActiveShiftUseCase.execute).toHaveBeenCalledWith(userId);
    expect(result).toEqual({ active: true });
  });

  it('should open shift if tenant_id matches req.user', async () => {
    const mockRequest = { user: { id: userId, tenant_id: tenantId } };
    const dto = { openingBalanceUsd: 10.00, openingBalanceVes: 0.00 };

    openShiftUseCase.execute.mockResolvedValue({ id: 'shift-id' } as any);

    const result = await controller.openShift(tenantId, mockRequest, dto);

    expect(openShiftUseCase.execute).toHaveBeenCalledWith(tenantId, userId, dto);
    expect(result).toEqual({ id: 'shift-id' });
  });

  it('should fail to open shift if tenantId in header does not match authenticated user tenant_id', async () => {
    const mockRequest = { user: { id: userId, tenant_id: 'other-tenant-id' } };
    const dto = { openingBalanceUsd: 10.00 };

    await expect(controller.openShift(tenantId, mockRequest, dto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should close shift if tenantId matches req.user', async () => {
    const mockRequest = { user: { id: userId, tenant_id: tenantId } };
    const dto = { declaredCashUsd: 10.00, declaredCashVes: 0.00 };

    closeShiftUseCase.execute.mockResolvedValue({ status: 'PENDING_APPROVAL' } as any);

    const result = await controller.closeShift(tenantId, mockRequest, dto);

    expect(closeShiftUseCase.execute).toHaveBeenCalledWith(tenantId, userId, dto);
    expect(result).toEqual({ status: 'PENDING_APPROVAL' });
  });

  it('should approve shift if user role is OWNER', async () => {
    const mockRequest = { user: { id: userId, tenant_id: tenantId, role: 'OWNER' } };
    const shiftId = 'shift-to-approve';

    approveShiftUseCase.execute.mockResolvedValue({ status: 'CLOSED' } as any);

    const result = await controller.approveShift(tenantId, shiftId, mockRequest);

    expect(approveShiftUseCase.execute).toHaveBeenCalledWith(tenantId, userId, shiftId);
    expect(result).toEqual({ status: 'CLOSED' });
  });

  it('should deny shift approval if user role is CASHIER', async () => {
    const mockRequest = { user: { id: userId, tenant_id: tenantId, role: 'CASHIER' } };
    const shiftId = 'shift-to-approve';

    await expect(controller.approveShift(tenantId, shiftId, mockRequest)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
