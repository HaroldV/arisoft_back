-- Migration 048: Drop legacy single-table foreign key constraint on account_payments
ALTER TABLE account_payments 
DROP CONSTRAINT IF EXISTS account_payments_account_id_fkey;

CREATE INDEX IF NOT EXISTS idx_account_payments_account_id ON account_payments(account_id);
