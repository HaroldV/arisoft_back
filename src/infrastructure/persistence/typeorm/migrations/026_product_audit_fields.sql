-- Migration 026: Add image_url and audit user tracking to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS created_by_user_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS updated_by_user_name VARCHAR(255);
