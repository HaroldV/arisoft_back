-- Migration: Add hierarchical fields to users
ALTER TABLE users ADD COLUMN creator_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN allowed_modules TEXT;

-- Update existing seeded users
UPDATE users SET allowed_modules = 'POS,INVENTORY,PAYROLL,WMS,REPORTS,SETTINGS' WHERE role = 'OWNER';
UPDATE users SET allowed_modules = 'POS' WHERE role = 'CASHIER';
