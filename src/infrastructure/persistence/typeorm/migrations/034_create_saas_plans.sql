-- 034_create_saas_plans.sql
-- Crea la tabla saas_plans para almacenar los planes de suscripción del ERP SaaS

CREATE TABLE IF NOT EXISTS saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    monthly_fee_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    annual_fee_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_users INT NOT NULL DEFAULT 10,
    max_products INT NOT NULL DEFAULT 2500,
    max_warehouses INT NOT NULL DEFAULT 1,
    has_fiscal_printing BOOLEAN NOT NULL DEFAULT false,
    enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    enabled_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    features_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    badge_text VARCHAR(100),
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_plans_code ON saas_plans(code);
CREATE INDEX IF NOT EXISTS idx_saas_plans_is_active ON saas_plans(is_active);
