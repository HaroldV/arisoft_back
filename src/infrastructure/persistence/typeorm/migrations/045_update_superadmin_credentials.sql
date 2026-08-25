-- Migration 045: Update SuperAdmin email to sadmin@arivsoft.com, role to SUPER_ADMIN, and set password to ArivPassword123!
UPDATE users 
SET email = 'sadmin@arivsoft.com',
    password_hash = '$2b$10$HSTHfRvKKjs1tzxGN9SA6Oei5TNEOcrpxnvnf6.NS9u/S4zPgnfVW',
    is_active = true,
    failed_login_attempts = 0,
    is_temporary_password = false
WHERE email IN ('superadmin@ari.com', 'sadmin@arivsoft.com') OR role = 'SUPER_ADMIN';
