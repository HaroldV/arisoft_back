-- Migration 043: Add is_temporary_password column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN NOT NULL DEFAULT false;

-- Mark superadmin, demo and initial default onboarding users as having temporary password if needed or leave false
