-- Migration 045: Safe initial superadmin user setup without mutating existing passwords
INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active, failed_login_attempts, is_temporary_password)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Super Admin',
    'sadmin@arivsoft.com',
    '$2b$10$HSTHfRvKKjs1tzxGN9SA6Oei5TNEOcrpxnvnf6.NS9u/S4zPgnfVW',
    'SUPER_ADMIN',
    true,
    0,
    false
)
ON CONFLICT (email) DO NOTHING;
