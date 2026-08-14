-- Migration: Add roles table and role_id reference in users table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  allowed_permissions TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_role_name UNIQUE (tenant_id, name)
);

ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Insert default system roles for all unique tenants currently in users
INSERT INTO roles (tenant_id, name, allowed_permissions, is_system)
SELECT DISTINCT tenant_id, 'OWNER', 'pos:create,pos:discount,pos:refund,clients:manage,inventory:view,inventory:write,inventory:adjust,purchases:register,providers:manage,banks:view,banks:write,banks:transfer,users:manage,fiscal:manage,company:manage', true
FROM users;

INSERT INTO roles (tenant_id, name, allowed_permissions, is_system)
SELECT DISTINCT tenant_id, 'MANAGER', 'pos:create,pos:discount,pos:refund,clients:manage,inventory:view,inventory:write,inventory:adjust,purchases:register,providers:manage', true
FROM users;

INSERT INTO roles (tenant_id, name, allowed_permissions, is_system)
SELECT DISTINCT tenant_id, 'CASHIER', 'pos:create,clients:manage,inventory:view', true
FROM users;

-- Reassociate existing users to their corresponding role_id based on role name matching
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.tenant_id = r.tenant_id AND u.role = r.name;
