-- Migration 031: Separate Accounts Receivable (CXC) and Accounts Payable (CXP) Tables
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  reference_document_id UUID,
  reference_document_number VARCHAR(100),
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

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_tenant ON accounts_receivable(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_client ON accounts_receivable(client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status);

CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  provider_name VARCHAR(255) NOT NULL,
  reference_document_id UUID,
  reference_document_number VARCHAR(100),
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

CREATE INDEX IF NOT EXISTS idx_accounts_payable_tenant ON accounts_payable(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_provider ON accounts_payable(provider_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status);

CREATE TABLE IF NOT EXISTS account_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
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
