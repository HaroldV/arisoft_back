import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantFiscalRange } from '../../../domain/entities/tenant-fiscal-range.entity';
import { TenantFiscalRangeRepository } from '../../../infrastructure/persistence/postgresql/repositories/tenant-fiscal-range.repository';
import { ConfigureFiscalRangeDto } from './dto/configure-fiscal-range.dto';

@Injectable()
export class ConfigureFiscalRangeUseCase {
  constructor(
    private readonly repo: TenantFiscalRangeRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(tenantId: string, dto: ConfigureFiscalRangeDto) {
    if (dto.startNumber >= dto.endNumber) {
      throw new BadRequestException('El número inicial debe ser estrictamente menor que el número final.');
    }

    return this.dataSource.transaction(async (manager) => {
      // Check if a range of this type already exists for the tenant
      let range = await manager.findOne(TenantFiscalRange, {
        where: { tenant_id: tenantId, type: dto.type }
      });

      if (range) {
        range.start_number = dto.startNumber;
        range.end_number = dto.endNumber;
        range.current_number = dto.currentNumber;
        range.authorization_number = dto.authorizationNumber.trim();
      } else {
        range = new TenantFiscalRange({
          tenant_id: tenantId,
          type: dto.type,
          start_number: dto.startNumber,
          end_number: dto.endNumber,
          current_number: dto.currentNumber,
          authorization_number: dto.authorizationNumber.trim(),
        });
      }

      return manager.save(TenantFiscalRange, range);
    });
  }
}
