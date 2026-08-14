-- Migration: Providers
-- Author: Antigravity (Dev Agent)
-- Date: 2026-07-01

CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, tax_id)
);

ALTER TABLE PURCHASE_INVOICES ADD COLUMN provider_id UUID REFERENCES providers(id) ON DELETE SET NULL;

CREATE INDEX idx_providers_tenant ON providers(tenant_id);
