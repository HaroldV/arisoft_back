-- Migration 044: Safe seed - Only insert demo user if not exists (Zero-Mutation guarantee)
INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active, failed_login_attempts, is_temporary_password)
VALUES (
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01',
    'Usuario Demostración',
    'demo@arivsoft.com',
    '$2b$10$HSTHfRvKKjs1tzxGN9SA6Oei5TNEOcrpxnvnf6.NS9u/S4zPgnfVW',
    'OWNER',
    true,
    0,
    true
)
ON CONFLICT (email) DO NOTHING;
