-- Migration 056: Add color_theme column to bank_accounts
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS color_theme VARCHAR(50) DEFAULT NULL;
