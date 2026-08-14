import { Injectable } from '@nestjs/common';
import { TenantFiscalRangeRepository } from '../../../infrastructure/persistence/typeorm/repositories/tenant-fiscal-range.repository';

@Injectable()
export class GetFiscalRangesUseCase {
  constructor(private readonly repo: TenantFiscalRangeRepository) {}

  async execute() {
    return this.repo.findRanges();
  }
}
