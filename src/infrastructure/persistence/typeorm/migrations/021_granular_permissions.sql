-- Migration: Add granular permissions column to users table
ALTER TABLE users ADD COLUMN allowed_permissions TEXT;

-- Update existing seeded users
UPDATE users SET allowed_permissions = 'pos:create,pos:discount,pos:refund,clients:manage,inventory:view,inventory:write,inventory:adjust,purchases:register,providers:manage,banks:view,banks:write,banks:transfer,users:manage,fiscal:manage,company:manage' WHERE role = 'OWNER';
UPDATE users SET allowed_permissions = 'pos:create,clients:manage,inventory:view' WHERE role = 'CASHIER';
