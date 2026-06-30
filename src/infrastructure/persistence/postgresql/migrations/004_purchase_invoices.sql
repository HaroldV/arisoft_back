-- Migration: Purchase Invoices and Stocks Auditing
-- Author: Antigravity (Dev Agent)
-- Date: 2026-06-27

-- Table: PURCHASE_INVOICES
CREATE TABLE PURCHASE_INVOICES (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    total_amount_usd NUMERIC(12, 4) NOT NULL,
    proof_file_path VARCHAR(255),
    created_by_user_id UUID NOT NULL REFERENCES USERS(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(tenant_id, invoice_number, supplier_name)
);

-- Table: PURCHASE_ITEMS
CREATE TABLE PURCHASE_ITEMS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES PURCHASE_INVOICES(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES PRODUCTS(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost_usd NUMERIC(12, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Alter PRODUCTS table to support soft delete
ALTER TABLE PRODUCTS ADD COLUMN deleted_at TIMESTAMP;

-- Alter STOCKS table with auditing columns
ALTER TABLE STOCKS ADD COLUMN source_type VARCHAR(50);
ALTER TABLE STOCKS ADD COLUMN source_id UUID;
ALTER TABLE STOCKS ADD COLUMN justification TEXT;
ALTER TABLE STOCKS ADD COLUMN created_by_user_id UUID REFERENCES USERS(id);

-- Indexes for performance
CREATE INDEX idx_purchase_invoices_tenant ON PURCHASE_INVOICES(tenant_id);
CREATE INDEX idx_purchase_items_purchase ON PURCHASE_ITEMS(purchase_id);
CREATE INDEX idx_purchase_items_product ON PURCHASE_ITEMS(product_id);
CREATE INDEX idx_products_deleted ON PRODUCTS(deleted_at) WHERE deleted_at IS NULL;
