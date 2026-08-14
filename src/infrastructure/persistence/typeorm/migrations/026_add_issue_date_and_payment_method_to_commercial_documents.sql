-- Migration 026: Add issue_date and payment_method to commercial_documents
ALTER TABLE commercial_documents ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE commercial_documents ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
