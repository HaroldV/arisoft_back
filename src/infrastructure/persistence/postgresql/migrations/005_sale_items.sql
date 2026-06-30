-- Migration: Sale Items Table
-- Author: Antigravity (Dev Agent)
-- Date: 2026-06-27

-- Table: SALE_ITEMS
CREATE TABLE SALE_ITEMS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES SALES(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES PRODUCTS(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_time_usd NUMERIC(12, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sale_items_sale ON SALE_ITEMS(sale_id);
CREATE INDEX idx_sale_items_product ON SALE_ITEMS(product_id);
