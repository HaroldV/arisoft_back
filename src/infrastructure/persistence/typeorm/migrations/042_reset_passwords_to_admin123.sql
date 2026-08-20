-- Migration 042: Force update password hash for Admin123! and reset failed login attempts
UPDATE users 
SET password_hash = '$2b$10$0mtB3FBArJ3D29wCGZyf8O/CsYkbuFl.SqcMaDz5JKHuVlaGgHOim',
    is_active = true,
    failed_login_attempts = 0
WHERE email IN ('superadmin@ari.com', 'admin@ari.com', 'alutechnology@gmail.com');
