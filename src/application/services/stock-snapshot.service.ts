import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../domain/entities/product.entity';
import { StockSnapshot, PeriodType } from '../../domain/entities/stock-snapshot.entity';
import { StockSnapshotRepository } from '../../infrastructure/persistence/typeorm/repositories/stock-snapshot.repository';

@Injectable()
export class StockSnapshotService {
  constructor(
    private readonly snapshotRepository: StockSnapshotRepository,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async generateDailySnapshot(
    tenantId: string,
    exchangeRate: number = 36.50,
    userName: string = 'Sistema',
  ): Promise<StockSnapshot[]> {
    const products = await this.productRepository.find({
      where: { tenant_id: tenantId },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const snapshots: StockSnapshot[] = [];

    for (const p of products) {
      const qty = Number(p.current_stock || 0);
      const costUsd = Number(p.cost_usd || p.costUsd || 0);
      const priceUsd = Number(p.price_usd || p.priceUsd || 0);
      const rate = Number(exchangeRate || 1);

      const totalCostUsd = Number((qty * costUsd).toFixed(2));
      const totalCostBs = Number((totalCostUsd * rate).toFixed(2));
      const totalPriceUsd = Number((qty * priceUsd).toFixed(2));
      const totalPriceBs = Number((totalPriceUsd * rate).toFixed(2));

      const snapshot = new StockSnapshot();
      snapshot.tenant_id = tenantId;
      snapshot.snapshot_date = todayStr;
      snapshot.period_type = PeriodType.DAILY;
      snapshot.product_id = p.id;
      snapshot.product_name = p.name;
      snapshot.sku = p.sku;
      snapshot.category_name = p.category?.name || 'General';
      snapshot.quantity_on_hand = qty;
      snapshot.unit_cost_usd = costUsd;
      snapshot.unit_price_usd = priceUsd;
      snapshot.exchange_rate = rate;
      snapshot.total_cost_usd = totalCostUsd;
      snapshot.total_cost_bs = totalCostBs;
      snapshot.total_price_usd = totalPriceUsd;
      snapshot.total_price_bs = totalPriceBs;
      snapshot.created_by_user_name = userName;

      snapshots.push(snapshot);
    }

    return this.snapshotRepository.saveBatch(snapshots);
  }

  async getValuationReport(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    customExchangeRate?: number,
    search?: string,
  ) {
    let snapshots = await this.snapshotRepository.findSnapshots(tenantId, startDate, endDate, search);

    // If no snapshots exist for the selected filter, generate dynamic report based on active products
    if (!snapshots || snapshots.length === 0) {
      const products = await this.productRepository.find({
        where: { tenant_id: tenantId },
      });
      const rate = customExchangeRate || 36.50;
      const todayStr = new Date().toISOString().split('T')[0];

      snapshots = products.map((p) => {
        const qty = Number(p.current_stock || 0);
        const costUsd = Number(p.cost_usd || p.costUsd || 0);
        const priceUsd = Number(p.price_usd || p.priceUsd || 0);

        const totalCostUsd = Number((qty * costUsd).toFixed(2));
        const totalCostBs = Number((totalCostUsd * rate).toFixed(2));
        const totalPriceUsd = Number((qty * priceUsd).toFixed(2));
        const totalPriceBs = Number((totalPriceUsd * rate).toFixed(2));

        const snap = new StockSnapshot();
        snap.id = p.id;
        snap.tenant_id = tenantId;
        snap.snapshot_date = todayStr;
        snap.period_type = PeriodType.DAILY;
        snap.product_id = p.id;
        snap.product_name = p.name;
        snap.sku = p.sku;
        snap.category_name = p.category?.name || 'General';
        snap.quantity_on_hand = qty;
        snap.unit_cost_usd = costUsd;
        snap.unit_price_usd = priceUsd;
        snap.exchange_rate = rate;
        snap.total_cost_usd = totalCostUsd;
        snap.total_cost_bs = totalCostBs;
        snap.total_price_usd = totalPriceUsd;
        snap.total_price_bs = totalPriceBs;
        snap.created_by_user_name = 'Sistema (Calculado)';
        return snap;
      });

      if (search) {
        const term = search.toLowerCase();
        snapshots = snapshots.filter(
          (s) =>
            s.product_name.toLowerCase().includes(term) ||
            (s.sku && s.sku.toLowerCase().includes(term)) ||
            (s.category_name && s.category_name.toLowerCase().includes(term)),
        );
      }
    } else if (customExchangeRate) {
      // Recalculate Bolívares values if user provided a custom exchange rate
      const rate = Number(customExchangeRate);
      snapshots = snapshots.map((s) => {
        const totalCostBs = Number((Number(s.total_cost_usd) * rate).toFixed(2));
        const totalPriceBs = Number((Number(s.total_price_usd) * rate).toFixed(2));
        return {
          ...s,
          exchange_rate: rate,
          total_cost_bs: totalCostBs,
          total_price_bs: totalPriceBs,
        };
      });
    }

    // Aggregate Summary KPIs
    const totalUnits = snapshots.reduce((acc, s) => acc + Number(s.quantity_on_hand), 0);
    const totalCostUsd = snapshots.reduce((acc, s) => acc + Number(s.total_cost_usd), 0);
    const totalCostBs = snapshots.reduce((acc, s) => acc + Number(s.total_cost_bs), 0);
    const totalPriceUsd = snapshots.reduce((acc, s) => acc + Number(s.total_price_usd), 0);
    const totalPriceBs = snapshots.reduce((acc, s) => acc + Number(s.total_price_bs), 0);
    const projectedProfitUsd = totalPriceUsd - totalCostUsd;

    return {
      kpis: {
        total_units: totalUnits,
        total_cost_usd: totalCostUsd,
        total_cost_bs: totalCostBs,
        total_price_usd: totalPriceUsd,
        total_price_bs: totalPriceBs,
        projected_profit_usd: projectedProfitUsd,
        applied_exchange_rate: customExchangeRate || snapshots[0]?.exchange_rate || 36.50,
      },
      items: snapshots,
    };
  }
}
