-- Add delivery_address column to clients and providers tables
ALTER TABLE clients ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS delivery_address TEXT;
