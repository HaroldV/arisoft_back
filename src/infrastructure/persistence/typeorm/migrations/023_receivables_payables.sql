-- Migration 023: Accounts Receivable and Payable (CXC / CXP)
CREATE TABLE IF NOT EXISTS accounts_receivable_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('PAYABLE', 'RECEIVABLE')),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('PROVIDER', 'CLIENT', 'PARTNER')),
  entity_id UUID,
  entity_name VARCHAR(255) NOT NULL,
  reference_date VARCHAR(100),
  notes TEXT,
  previous_balance DECIMAL(14,2) DEFAULT 0.00,
  period_amount DECIMAL(14,2) DEFAULT 0.00,
  total_paid DECIMAL(14,2) DEFAULT 0.00,
  balance_due DECIMAL(14,2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')),
  created_by_user_id UUID,
  created_by_user_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_arp_tenant_type ON accounts_receivable_payable(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_arp_tenant_status ON accounts_receivable_payable(tenant_id, status);

CREATE TABLE IF NOT EXISTS account_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts_receivable_payable(id) ON DELETE CASCADE,
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH_BS', 'DEBIT_BS', 'CASH_USD', 'TRANSFER_USD')),
  currency VARCHAR(5) NOT NULL DEFAULT 'USD',
  amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
  amount_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  reference_number VARCHAR(100),
  created_by_user_id UUID,
  created_by_user_name VARCHAR(255),
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_payments_account ON account_payments(account_id);
