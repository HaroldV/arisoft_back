-- Migration 047: Add missing warehouse_location_id, source metadata, and user audit columns to stocks table
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id UUID,
ADD COLUMN IF NOT EXISTS justification TEXT,
ADD COLUMN IF NOT EXISTS warehouse_location_id UUID REFERENCES warehouse_location(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stocks_tenant_product ON stocks(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stocks_warehouse_location ON stocks(warehouse_location_id);
CREATE INDEX IF NOT EXISTS idx_stocks_source ON stocks(source_type, source_id);
