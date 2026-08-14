-- Migration: 029_provider_tax_retention_schema.sql
-- Description: Tax retention configuration fields for providers (SENIAT IVA/ISLR Retention Agent support)

ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS is_retention_agent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS retention_percentage NUMERIC(5, 2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS islr_percentage NUMERIC(5, 2) DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS islr_concept_code VARCHAR(100) DEFAULT 'SERVICES';
