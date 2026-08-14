-- Create bank_accounts table
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50),
    account_type VARCHAR(20) NOT NULL, -- 'CORRIENTE', 'AHORRO', 'EFECTIVO'
    currency VARCHAR(3) NOT NULL, -- 'USD', 'VES'
    current_balance NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    p2p_phone VARCHAR(50),
    p2p_tax_id VARCHAR(50),
    p2p_bank_code VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_accounts_tenant ON bank_accounts(tenant_id);

-- Create bank_movements table for tracking logs
CREATE TABLE bank_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT'
    amount NUMERIC(12, 4) NOT NULL,
    reference VARCHAR(50),
    description VARCHAR(255),
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_movements_tenant ON bank_movements(tenant_id);
CREATE INDEX idx_bank_movements_account ON bank_movements(account_id);
