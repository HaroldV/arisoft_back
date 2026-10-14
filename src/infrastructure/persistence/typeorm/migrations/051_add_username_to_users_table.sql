-- Migration 051: Add username to users table, allow nullable email, and enforce tenant-level username uniqueness
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Backfill existing users: use email prefix if username is null
UPDATE users
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL AND email IS NOT NULL;

-- In case there are null usernames after backfill, assign a fallback
UPDATE users
SET username = 'user_' || SUBSTRING(id::text, 1, 8)
WHERE username IS NULL;

-- Allow email to be nullable (employees can be registered with username only)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Ensure username is not null going forward
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Unique constraint for username per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username ON users (tenant_id, LOWER(TRIM(username)));
