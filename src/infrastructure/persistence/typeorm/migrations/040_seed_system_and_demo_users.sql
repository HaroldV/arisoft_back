-- Migration 040: Seed initial system and demo users ONLY if they do not exist
DO $$
DECLARE
    v_password_hash VARCHAR := '$2b$10$0mtB3FBArJ3D29wCGZyf8O/CsYkbuFl.SqcMaDz5JKHuVlaGgHOim';
    v_demo_password_hash VARCHAR := '$2b$10$HSTHfRvKKjs1tzxGN9SA6Oei5TNEOcrpxnvnf6.NS9u/S4zPgnfVW';
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
    ON CONFLICT (id) DO NOTHING;

    -- 2. Super Admin User
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'superadmin@ari.com') THEN
        INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active, failed_login_attempts)
        VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', v_system_tenant_id, 'Super Admin', 'superadmin@ari.com', v_password_hash, 'SUPER_ADMIN', true, 0)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 3. Demo User
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@erparisoft.com') THEN
        INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active, failed_login_attempts)
        VALUES ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', v_demo_tenant_id, 'Usuario Demostración', 'demo@erparisoft.com', v_demo_password_hash, 'OWNER', true, 0)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    -- 4. Alu Technology Tenant and User
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
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'alutechnology@gmail.com') THEN
        INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active, failed_login_attempts)
        VALUES ('36fb17a2-49e9-4da5-ba52-a0c632a00002', v_alu_tenant_id, 'Edgar Ramirez', 'alutechnology@gmail.com', v_password_hash, 'OWNER', true, 0)
        ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;
