-- Migration 052: Add BNPL and Cashea fields to sale_payments
-- Rule 8 Compliance: DDL only, backward compatible

ALTER TABLE sale_payments
ADD COLUMN IF NOT EXISTS bnpl_provider VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bnpl_order_id VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bnpl_initial_amount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS bnpl_financed_amount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(30) DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_sale_payments_bnpl_provider ON sale_payments(bnpl_provider);
CREATE INDEX IF NOT EXISTS idx_sale_payments_settlement_status ON sale_payments(settlement_status);
