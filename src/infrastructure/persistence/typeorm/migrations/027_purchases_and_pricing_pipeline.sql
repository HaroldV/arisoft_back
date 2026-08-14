-- Migration: 027_purchases_and_pricing_pipeline.sql
-- Description: Purchase Orders, Reception Notes, Cost History, and Vendor Credit Notes

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED')),
    expected_date TIMESTAMP,
    notes TEXT,
    subtotal_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
    tax_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
    total_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
    created_by_user_id UUID NOT NULL REFERENCES USERS(id),
    created_by_user_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES PRODUCTS(id),
    quantity_ordered NUMERIC(12, 4) NOT NULL CHECK (quantity_ordered > 0),
    quantity_received NUMERIC(12, 4) NOT NULL DEFAULT 0,
    unit_cost_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
    total_cost_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_reception_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    reception_number VARCHAR(100) NOT NULL,
    order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255) NOT NULL,
    warehouse_name VARCHAR(255) DEFAULT 'Almacén Principal',
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',
    notes TEXT,
    created_by_user_id UUID NOT NULL REFERENCES USERS(id),
    created_by_user_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_reception_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reception_id UUID NOT NULL REFERENCES purchase_reception_notes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES PRODUCTS(id),
    quantity_received NUMERIC(12, 4) NOT NULL CHECK (quantity_received > 0),
    unit_cost_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_cost_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES PRODUCTS(id) ON DELETE CASCADE,
    old_cost_usd NUMERIC(12, 4) NOT NULL,
    new_cost_usd NUMERIC(12, 4) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID,
    created_by_user_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
