-- Migration 038: Create table if not exists AND Add extended fields to subscription_payment_receipts
CREATE TABLE IF NOT EXISTS subscription_payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    plan_code VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
    amount_usd NUMERIC(12, 2) NOT NULL,
    amount_bcv_bs NUMERIC(12, 2) NOT NULL,
    bcv_rate_used NUMERIC(10, 4) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100) NOT NULL,
    bank_origin VARCHAR(100),
    payment_date DATE,
    zelle_account_owner VARCHAR(150),
    zelle_email VARCHAR(150),
    binance_id VARCHAR(100),
    binance_email VARCHAR(150),
    receipt_image_base64 TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
    rejection_reason TEXT,
    reviewed_at TIMESTAMP,
    reviewed_by_user_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE subscription_payment_receipts 
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS zelle_account_owner VARCHAR(150),
ADD COLUMN IF NOT EXISTS zelle_email VARCHAR(150),
ADD COLUMN IF NOT EXISTS binance_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS binance_email VARCHAR(150),
ADD COLUMN IF NOT EXISTS receipt_image_base64 TEXT;
