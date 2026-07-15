-- Add discount columns to purchase_invoices table
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS discount_amount_usd NUMERIC(12,4) DEFAULT 0.0000;
