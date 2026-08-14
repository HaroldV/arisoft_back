-- Migration 025: Commercial Sales Pipeline Documents (Quotations, Sales Orders, Delivery Notes)
CREATE TABLE IF NOT EXISTS commercial_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('QUOTATION', 'SALES_ORDER', 'DELIVERY_NOTE')),
  document_number VARCHAR(100) NOT NULL,
  source_document_id UUID REFERENCES commercial_documents(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  client_tax_id VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  valid_until DATE,
  delivery_date DATE,
  subtotal_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
  total_bs DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  carrier_name VARCHAR(255),
  vehicle_plate VARCHAR(50),
  driver_name VARCHAR(255),
  notes TEXT,
  created_by_user_id UUID,
  created_by_user_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comm_docs_tenant_type ON commercial_documents(tenant_id, document_type);
CREATE INDEX IF NOT EXISTS idx_comm_docs_tenant_status ON commercial_documents(tenant_id, status);

CREATE TABLE IF NOT EXISTS commercial_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES commercial_documents(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  unit_price_usd DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
  quantity DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
  subtotal_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_comm_items_document ON commercial_document_items(document_id);
