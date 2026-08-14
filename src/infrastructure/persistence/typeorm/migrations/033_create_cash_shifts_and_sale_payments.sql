-- Migration 033: Create cash_shifts and sale_payments tables
-- Author: Amelia (Dev Agent)
-- Date: 2026-08-09

CREATE TABLE IF NOT EXISTS cash_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    opening_balance_usd NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    opening_balance_ves NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    declared_cash_usd NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    declared_cash_ves NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_cash_usd NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_cash_ves NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discrepancy_usd NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discrepancy_ves NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    approved_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES cash_shifts(id);

CREATE TABLE IF NOT EXISTS sale_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    amount_original NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    exchange_rate_applied NUMERIC(12, 4) NOT NULL,
    amount_usd NUMERIC(12, 2) NOT NULL,
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT UQ_tenant_method_reference UNIQUE (tenant_id, payment_method, transaction_reference)
);

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_tenant_id ON sale_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_tenant_id ON cash_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_cashier_id ON cash_shifts(cashier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_shift ON cash_shifts(tenant_id, cashier_id) WHERE (status = 'OPEN');

