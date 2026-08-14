-- Migration 032: Add payment_method to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
