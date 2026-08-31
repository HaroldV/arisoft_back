-- Migration 046: Add Supplier Invoice and Registration Metadata to Accounts Payable (CXP)
ALTER TABLE accounts_payable 
ADD COLUMN IF NOT EXISTS supplier_invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS voucher_attachment_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_registered_by_user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS invoice_registered_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_accounts_payable_supplier_inv ON accounts_payable(supplier_invoice_number);
