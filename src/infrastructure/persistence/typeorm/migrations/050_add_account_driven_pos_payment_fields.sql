-- Migration 050: Add account-driven POS payment fields and traceability
-- Rule 8 Compliance: DDL only, backward compatible

ALTER TABLE sale_payments
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_four_digits VARCHAR(10),
ADD COLUMN IF NOT EXISTS sender_identifier VARCHAR(255);

ALTER TABLE bank_movements
ADD COLUMN IF NOT EXISTS sale_payment_id UUID REFERENCES sale_payments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sale_payments_bank_account ON sale_payments(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_movements_sale_payment ON bank_movements(sale_payment_id);
