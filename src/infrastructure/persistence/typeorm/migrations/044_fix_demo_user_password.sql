-- Migration 044: Reset demo user password hash to valid DemoAri2026! bcrypt hash and set is_temporary_password = true
UPDATE users 
SET password_hash = '$2b$10$HSTHfRvKKjs1tzxGN9SA6Oei5TNEOcrpxnvnf6.NS9u/S4zPgnfVW',
    is_active = true,
    failed_login_attempts = 0,
    is_temporary_password = true
WHERE email IN ('demo@erparisoft.com', 'demo@ari.com', 'demo@arivsoft.com');
