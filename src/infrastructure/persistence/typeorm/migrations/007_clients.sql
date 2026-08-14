-- Migration: Clients
-- Author: Antigravity (Dev Agent)
-- Date: 2026-07-01

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(100) NOT NULL, -- Cédula o RIF: V-12345678-9
    email VARCHAR(255),
    phone VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, tax_id)
);

ALTER TABLE SALES ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
