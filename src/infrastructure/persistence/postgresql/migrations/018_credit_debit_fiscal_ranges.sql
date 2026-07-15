-- Migration: Support separate Credit Note and Debit Note ranges
ALTER TABLE tenant_fiscal_ranges DROP CONSTRAINT IF EXISTS tenant_fiscal_ranges_type_check;
ALTER TABLE tenant_fiscal_ranges ADD CONSTRAINT tenant_fiscal_ranges_type_check CHECK (type IN ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'));
