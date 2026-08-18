-- 035_seed_commercial_demo_account.sql
-- Crea o actualiza la empresa y usuario de demostración comercial con acceso total al ERP

DO $$
DECLARE
    v_tenant_id UUID := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01';
    v_user_id UUID := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02';
    v_password_hash VARCHAR := '$2b$10$pt.sLuZj5OofdJCIz.RjsuHbVx9bJogiwfCgzbWl7VwolnQxwpHm2'; -- DemoAri2026!
BEGIN
    -- 1. Insertar o actualizar Tenant Demo
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id OR tax_id = 'J-99999999-0') THEN
        INSERT INTO tenants (
            id,
            company_name,
            tax_id,
            plan_type,
            trial_expires_at,
            is_active,
            plan_is_active,
            settings
        ) VALUES (
            v_tenant_id,
            'ARI Demostración Comercial C.A.',
            'J-99999999-0',
            'CORPORATIVO',
            '2035-12-31 23:59:59',
            true,
            true,
            jsonb_build_object(
                'subdomain', 'demo',
                'max_users', 999,
                'max_products', 99999,
                'monthly_fee_usd', 80,
                'enabled_modules', jsonb_build_array('POS', 'SALES', 'INVENTORY', 'INVENTORY_PURCHASES', 'BANKS', 'REPORTS', 'SETTINGS', 'PAYROLL'),
                'enabled_permissions', jsonb_build_array(
                    'pos:create', 'pos:discount', 'pos:refund', 'pos:shifts',
                    'sales:invoicing', 'sales:quotations', 'sales:orders', 'sales:deliveries', 'clients:manage',
                    'purchases:orders', 'purchases:receptions', 'purchases:new', 'purchases:invoices', 'providers:manage',
                    'inventory:create', 'inventory:stock', 'inventory:bulk_prices', 'inventory:valuation', 'inventory:warehouse', 'inventory:categories', 'inventory:moves',
                    'banks:accounts', 'accounts:receivables', 'accounts:payables', 'accounts:history',
                    'reports:view',
                    'company:manage', 'fiscal:manage', 'users:manage'
                ),
                'owner_email', 'demo@erparisoft.com',
                'owner_name', 'Usuario Demostración'
            )
        );
    ELSE
        UPDATE tenants
        SET 
            plan_type = 'CORPORATIVO',
            trial_expires_at = '2035-12-31 23:59:59',
            is_active = true,
            plan_is_active = true,
            settings = jsonb_build_object(
                'subdomain', 'demo',
                'max_users', 999,
                'max_products', 99999,
                'monthly_fee_usd', 80,
                'enabled_modules', jsonb_build_array('POS', 'SALES', 'INVENTORY', 'INVENTORY_PURCHASES', 'BANKS', 'REPORTS', 'SETTINGS', 'PAYROLL'),
                'enabled_permissions', jsonb_build_array(
                    'pos:create', 'pos:discount', 'pos:refund', 'pos:shifts',
                    'sales:invoicing', 'sales:quotations', 'sales:orders', 'sales:deliveries', 'clients:manage',
                    'purchases:orders', 'purchases:receptions', 'purchases:new', 'purchases:invoices', 'providers:manage',
                    'inventory:create', 'inventory:stock', 'inventory:bulk_prices', 'inventory:valuation', 'inventory:warehouse', 'inventory:categories', 'inventory:moves',
                    'banks:accounts', 'accounts:receivables', 'accounts:payables', 'accounts:history',
                    'reports:view',
                    'company:manage', 'fiscal:manage', 'users:manage'
                ),
                'owner_email', 'demo@erparisoft.com',
                'owner_name', 'Usuario Demostración'
            )
        WHERE id = v_tenant_id OR tax_id = 'J-99999999-0';
    END IF;

    -- Obtener el ID real del tenant por si existía por tax_id
    SELECT id INTO v_tenant_id FROM tenants WHERE tax_id = 'J-99999999-0' LIMIT 1;

    -- 2. Insertar o actualizar Usuario Demo
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@erparisoft.com') THEN
        INSERT INTO users (
            id,
            tenant_id,
            full_name,
            email,
            password_hash,
            role,
            is_active,
            allowed_permissions
        ) VALUES (
            v_user_id,
            v_tenant_id,
            'Usuario Demostración',
            'demo@erparisoft.com',
            v_password_hash,
            'OWNER',
            true,
            'pos:create,pos:discount,pos:refund,pos:shifts,sales:invoicing,sales:quotations,sales:orders,sales:deliveries,clients:manage,purchases:orders,purchases:receptions,purchases:new,purchases:invoices,providers:manage,inventory:create,inventory:stock,inventory:bulk_prices,inventory:valuation,inventory:warehouse,inventory:categories,inventory:moves,banks:accounts,accounts:receivables,accounts:payables,accounts:history,reports:view,company:manage,fiscal:manage,users:manage'
        );
    ELSE
        UPDATE users
        SET 
            tenant_id = v_tenant_id,
            full_name = 'Usuario Demostración',
            password_hash = v_password_hash,
            role = 'OWNER',
            is_active = true,
            failed_login_attempts = 0,
            allowed_permissions = 'pos:create,pos:discount,pos:refund,pos:shifts,sales:invoicing,sales:quotations,sales:orders,sales:deliveries,clients:manage,purchases:orders,purchases:receptions,purchases:new,purchases:invoices,providers:manage,inventory:create,inventory:stock,inventory:bulk_prices,inventory:valuation,inventory:warehouse,inventory:categories,inventory:moves,banks:accounts,accounts:receivables,accounts:payables,accounts:history,reports:view,company:manage,fiscal:manage,users:manage'
        WHERE email = 'demo@erparisoft.com';
    END IF;

END $$;
