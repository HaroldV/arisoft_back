-- Migration 039: Add failed_login_attempts column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
