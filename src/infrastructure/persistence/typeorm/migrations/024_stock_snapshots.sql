-- Migration 024: Historical Stock Valuation Snapshots (stock_snapshots)
CREATE TABLE IF NOT EXISTS stock_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_type VARCHAR(20) NOT NULL DEFAULT 'DAILY' CHECK (period_type IN ('DAILY', 'MONTHLY', 'ANNUAL', 'RANGE')),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  category_name VARCHAR(100),
  quantity_on_hand DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  unit_cost_usd DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
  unit_price_usd DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
  exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
  total_cost_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_cost_bs DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_price_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_price_bs DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  created_by_user_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_tenant_date ON stock_snapshots(tenant_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_tenant_period ON stock_snapshots(tenant_id, period_type);
