import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockSnapshot } from '../../../../domain/entities/stock-snapshot.entity';

@Injectable()
export class StockSnapshotRepository {
  constructor(
    @InjectRepository(StockSnapshot)
    private readonly repository: Repository<StockSnapshot>,
  ) {}

  async saveBatch(snapshots: StockSnapshot[]): Promise<StockSnapshot[]> {
    return this.repository.save(snapshots);
  }

  async findSnapshots(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    search?: string,
  ): Promise<StockSnapshot[]> {
    const qb = this.repository.createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId });

    if (startDate) {
      qb.andWhere('s.snapshot_date >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('s.snapshot_date <= :endDate', { endDate });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(s.product_name) LIKE :search OR LOWER(s.sku) LIKE :search OR LOWER(s.category_name) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    qb.orderBy('s.snapshot_date', 'DESC').addOrderBy('s.product_name', 'ASC');

    return qb.getMany();
  }

  async findLatestByDate(tenantId: string, date: string): Promise<StockSnapshot[]> {
    return this.repository.find({
      where: {
        tenant_id: tenantId,
        snapshot_date: date,
      },
      order: {
        product_name: 'ASC',
      },
    });
  }
}
