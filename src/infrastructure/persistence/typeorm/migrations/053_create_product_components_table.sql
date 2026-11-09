-- Migration: 053_create_product_components_table.sql
-- Description: Add product_type to products and create product_components for composite products / bundles

-- 1. Agregar columna tipo de producto en tabla products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(30) NOT NULL DEFAULT 'SIMPLE';

-- 2. Crear tabla relacional de componentes / receta del bulto o combo
CREATE TABLE IF NOT EXISTS product_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    child_product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    unit_cost_at_definition NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_tenant_parent_child UNIQUE (tenant_id, parent_product_id, child_product_id)
);

-- 3. Índices para acelerar consultas multi-tenant y búsquedas de bultos
CREATE INDEX IF NOT EXISTS idx_product_components_tenant_parent 
    ON product_components(tenant_id, parent_product_id);

CREATE INDEX IF NOT EXISTS idx_product_components_tenant_child 
    ON product_components(tenant_id, child_product_id);
