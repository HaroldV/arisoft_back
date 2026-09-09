-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    default_warehouse_id UUID REFERENCES warehouse_location(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_main BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branches_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_default_warehouse_id ON branches(default_warehouse_id);

-- Add branch_id to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

-- Add branch_id to sales if not exists
ALTER TABLE sales ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);

-- Add branch_id to cash_shifts if not exists
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cash_shifts_branch_id ON cash_shifts(branch_id);

-- Add branch_id to bank_accounts if not exists
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_branch_id ON bank_accounts(branch_id);
