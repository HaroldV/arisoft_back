-- Migration: Initial Multitenant Schema
-- Author: Amelia (Dev Agent)
-- Date: 2026-03-11

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: TENANTS
CREATE TABLE TENANTS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) NOT NULL UNIQUE, -- RIF
    plan_type VARCHAR(50) DEFAULT 'TRIAL_90',
    trial_expires_at TIMESTAMP NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: USERS
CREATE TABLE USERS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- OWNER, MANAGER, CASHIER
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- Table: PRODUCTS
CREATE TABLE PRODUCTS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cost_usd NUMERIC(12, 4) NOT NULL,
    price_usd NUMERIC(12, 4) NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 16.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, sku)
);

-- Table: SALES
CREATE TABLE SALES (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES USERS(id),
    total_amount_usd NUMERIC(12, 4) NOT NULL,
    exchange_rate_applied NUMERIC(12, 4) NOT NULL,
    status VARCHAR(50) DEFAULT 'PAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: STOCKS
-- Note: Journaling model (Double Entry)
CREATE TABLE STOCKS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES PRODUCTS(id),
    type VARCHAR(50) NOT NULL, -- INITIAL_LOAD, SALE, PURCHASE, ADJUSTMENT
    quantity INTEGER NOT NULL,
    cost_at_time NUMERIC(12, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: WAREHOUSE_LOCATION
CREATE TABLE WAREHOUSE_LOCATION (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES WAREHOUSE_LOCATION(id), -- Hierarchical support
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- WAREHOUSE, AISLE, SHELF, BIN
    capacity_limit INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: PAYROLL_FORMULA
CREATE TABLE PAYROLL_FORMULA (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- IVSS, FAOV, CT
    percentage NUMERIC(5, 4), -- 0.0400 for 4%
    base_type VARCHAR(50) NOT NULL, -- BASE_SALARY, INTEGRAL_SALARY
    limit_type VARCHAR(50), -- MIN_WAGE_MULTIPLIER
    limit_value INTEGER, -- ej: 5 (sueldos mínimos)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: EMPLOYEE_PAYROLL_ENTRY
CREATE TABLE EMPLOYEE_PAYROLL_ENTRY (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES TENANTS(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES USERS(id), -- Employee reference
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary_ves NUMERIC(12, 2) NOT NULL,
    total_deductions_ves NUMERIC(12, 2) NOT NULL,
    total_bonuses_ves NUMERIC(12, 2) NOT NULL,
    net_payable_ves NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for Multitenancy Optimization (Code Review Fix)
-- Single indexes
CREATE INDEX idx_users_tenant ON USERS(tenant_id);
CREATE INDEX idx_products_tenant ON PRODUCTS(tenant_id);
CREATE INDEX idx_sales_tenant ON SALES(tenant_id);
CREATE INDEX idx_stocks_tenant ON STOCKS(tenant_id);
CREATE INDEX idx_warehouse_tenant ON WAREHOUSE_LOCATION(tenant_id);
CREATE INDEX idx_payroll_formula_tenant ON PAYROLL_FORMULA(tenant_id);
CREATE INDEX idx_payroll_entry_tenant ON EMPLOYEE_PAYROLL_ENTRY(tenant_id);

-- Composite indexes for high-volume queries (tenant_id + secondary criteria)
CREATE INDEX idx_products_sku_tenant ON PRODUCTS(tenant_id, sku);
CREATE INDEX idx_sales_tenant_date ON SALES(tenant_id, created_at DESC);
CREATE INDEX idx_stocks_tenant_product ON STOCKS(tenant_id, product_id);
CREATE INDEX idx_stocks_tenant_date ON STOCKS(tenant_id, created_at DESC);
CREATE INDEX idx_users_tenant_id ON USERS(tenant_id, id);
