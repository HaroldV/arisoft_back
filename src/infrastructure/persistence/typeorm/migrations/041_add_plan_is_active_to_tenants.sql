-- Migration 041: Add plan_is_active column to tenants table IF NOT EXISTS
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan_is_active BOOLEAN DEFAULT FALSE;
