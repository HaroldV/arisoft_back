-- Create stock_balances table
CREATE TABLE IF NOT EXISTS stock_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES warehouse_location(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT stock_balances_unique_key UNIQUE (tenant_id, location_id, product_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_balances_product ON stock_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_location ON stock_balances(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_batch ON stock_balances(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_tenant ON stock_balances(tenant_id);
