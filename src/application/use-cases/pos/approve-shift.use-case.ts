import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CashShift } from '../../../domain/entities/cash-shift.entity';
import { CashShiftRepository } from '../../../infrastructure/persistence/typeorm/repositories/cash-shift.repository';

@Injectable()
export class ApproveShiftUseCase {
  constructor(
    private readonly cashShiftRepo: CashShiftRepository,
  ) {}

  async execute(tenantId: string, supervisorId: string, shiftId: string): Promise<CashShift> {
    // 1. Find shift by id
    const shift = await this.cashShiftRepo.findById(shiftId);
    if (!shift) {
      throw new NotFoundException(`Turno de caja con ID ${shiftId} no encontrado.`);
    }

    // 2. Validate current status
    if (shift.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Solo se pueden aprobar turnos de caja que estén pendientes de aprobación.');
    }

    // 3. Mark as closed and approved
    shift.status = 'CLOSED';
    shift.approved_by_id = supervisorId;
    shift.updated_at = new Date();

    return await this.cashShiftRepo.save(shift);
  }
}
