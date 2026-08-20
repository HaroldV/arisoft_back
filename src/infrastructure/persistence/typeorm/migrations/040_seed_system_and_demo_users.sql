-- Migration 040: Seed or reset superadmin, demo and alutechnology users with valid bcrypt hashes
DO $$
DECLARE
    v_password_hash VARCHAR := '$2b$10$0mtB3FBArJ3D29wCGZyf8O/CsYkbuFl.SqcMaDz5JKHuVlaGgHOim'; -- Admin123! (verified hash)
    v_demo_password_hash VARCHAR := '$2b$10$pt.sLuZj5OofdJCIz.RjsuHbVx9bJogiwfCgzbWl7VwolnQxwpHm2'; -- DemoAri2026!
    v_system_tenant_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_demo_tenant_id UUID := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01';
    v_alu_tenant_id UUID := '0a19cf31-6818-4a84-b280-9a2d3b1c54d3';
BEGIN
    -- 1. System Tenant
    INSERT INTO tenants (id, company_name, tax_id, plan_type, trial_expires_at, is_active, settings)
    VALUES (
        v_system_tenant_id,
        'ARI Corp',
        'J-12345678-9',
        'CORPORATIVO',
        '2035-12-31 23:59:59',
        true,
        jsonb_build_object('allow_negative_stock', true, 'enabled_modules', jsonb_build_array('POS', 'SALES', 'INVENTORY', 'BANKS', 'REPORTS', 'SETTINGS', 'PAYROLL'))
    )
    ON CONFLICT (id) DO UPDATE SET is_active = true, plan_type = 'CORPORATIVO';

    -- 2. Super Admin User (superadmin@ari.com / Admin123!)
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'superadmin@ari.com') THEN
        INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active, failed_login_attempts)
        VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', v_system_tenant_id, 'Super Admin', 'superadmin@ari.com', v_password_hash, 'SUPER_ADMIN', true, 0);
    ELSE
        UPDATE users
        SET password_hash = v_password_hash,
            is_active = true,
            failed_login_attempts = 0
        WHERE email = 'superadmin@ari.com';
    END IF;

    -- 3. Demo User (demo@erparisoft.com / DemoAri2026!)
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@erparisoft.com') THEN
        INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active, failed_login_attempts)
        VALUES ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', v_demo_tenant_id, 'Usuario Demostración', 'demo@erparisoft.com', v_demo_password_hash, 'OWNER', true, 0);
    ELSE
        UPDATE users
        SET password_hash = v_demo_password_hash,
            is_active = true,
            failed_login_attempts = 0
        WHERE email = 'demo@erparisoft.com';
    END IF;

    -- 4. Alu Technology Tenant and User (alutechnology@gmail.com / Admin123!)
    INSERT INTO tenants (id, company_name, tax_id, plan_type, trial_expires_at, is_active, settings)
    VALUES (
        v_alu_tenant_id,
        'Alu Technology',
        'J-98765432-1',
        'CORPORATIVO',
        '2035-12-31 23:59:59',
        true,
        jsonb_build_object('allow_negative_stock', true, 'enabled_modules', jsonb_build_array('POS', 'SALES', 'INVENTORY', 'BANKS', 'REPORTS', 'SETTINGS', 'PAYROLL'))
    )
    ON CONFLICT (id) DO UPDATE SET is_active = true, plan_type = 'CORPORATIVO';

    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'alutechnology@gmail.com') THEN
        INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active, failed_login_attempts)
        VALUES ('36fb17a2-49e9-4da5-ba52-a0c632a00002', v_alu_tenant_id, 'Edgar Ramirez', 'alutechnology@gmail.com', v_password_hash, 'OWNER', true, 0);
    ELSE
        UPDATE users
        SET password_hash = v_password_hash,
            is_active = true,
            failed_login_attempts = 0
        WHERE email = 'alutechnology@gmail.com';
    END IF;

END $$;
