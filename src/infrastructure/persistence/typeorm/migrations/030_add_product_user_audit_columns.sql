-- Migration: 030_add_product_user_audit_columns.sql
-- Description: Refactor product user audit to strict relational FKs referencing users(id) and ensure image_url exists

ALTER TABLE products
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Remove redundant text columns from products table if exist
ALTER TABLE products
DROP COLUMN IF EXISTS created_by_user_name,
DROP COLUMN IF EXISTS updated_by_user_name;
