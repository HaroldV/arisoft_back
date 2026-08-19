-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create unique index for name and tenant (or global if NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_tenant_name 
ON categories (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name));

-- Seed default system categories (Venezuela CAEV 5-digits)
INSERT INTO categories (tenant_id, name, code, is_active) VALUES
(NULL, 'Víveres Secos', '47111', true),
(NULL, 'Charcutería y Lácteos', '47219', true),
(NULL, 'Carnicería y Aves', '47211', true),
(NULL, 'Pescadería', '47212', true),
(NULL, 'Frutería y Hortalizas', '47213', true),
(NULL, 'Panadería y Repostería', '47214', true),
(NULL, 'Bebidas no Alcohólicas', '47111', true),
(NULL, 'Licores y Bodegón', '47220', true),
(NULL, 'Salsas y Condimentos', '47111', true),
(NULL, 'Enlatados y Conservas', '47111', true),
(NULL, 'Higiene Personal', '47723', true),
(NULL, 'Cuidado Capilar y Belleza', '47723', true),
(NULL, 'Limpieza del Hogar', '47111', true),
(NULL, 'Desechables y Papelería del Hogar', '47111', true),
(NULL, 'Medicamentos con Récipe', '47721', true),
(NULL, 'Medicamentos de Venta Libre (OTC)', '47721', true),
(NULL, 'Material Médico Quirúrgico', '47729', true),
(NULL, 'Suplementos y Vitaminas', '47721', true),
(NULL, 'Ferretería General', '47520', true),
(NULL, 'Repuestos y Autopartes', '45300', true),
(NULL, 'Lubricantes y Aditivos', '45300', true),
(NULL, 'Accesorios de Vehículos', '45300', true),
(NULL, 'Repuestos de Motos', '45400', true),
(NULL, 'Ropa de Dama', '47711', true),
(NULL, 'Ropa de Caballero', '47711', true),
(NULL, 'Ropa Infantil', '47711', true),
(NULL, 'Calzado y Zapatos', '47712', true),
(NULL, 'Accesorios de Moda', '47719', true),
(NULL, 'Lencería y Hogar', '47510', true),
(NULL, 'Teléfonos Celulares', '47411', true),
(NULL, 'Accesorios Celulares', '47411', true),
(NULL, 'Computación y Oficina', '47412', true),
(NULL, 'Audio y Video', '47420', true),
(NULL, 'Electrodomésticos', '47590', true),
(NULL, 'Útiles Escolares', '47610', true),
(NULL, 'Artículos de Oficina', '47610', true),
(NULL, 'Librería y Textos', '47610', true),
(NULL, 'Juguetes y Figuras', '47640', true),
(NULL, 'Artículos Deportivos', '47630', true),
(NULL, 'Artículos de Fiesta', '47190', true),
(NULL, 'Mascotas (Pet Shop)', '47739', true),
(NULL, 'Comida Rápida y Platos Preparados', '56101', true),
(NULL, 'Cafetería y Repostería', '56101', true),
(NULL, 'Ingredientes de Cocina Comercial', '46301', true),
(NULL, 'Servicios Técnicos y Reparaciones', '95110', true),
(NULL, 'Suscripciones y Recargas', '61900', true),
(NULL, 'General', '47190', true)
ON CONFLICT DO NOTHING;

-- Add category_id to products if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Import categories from existing products if the category column still exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'category'
    ) THEN
        INSERT INTO categories (tenant_id, name, code, is_active)
        SELECT DISTINCT p.tenant_id, p.category, NULL, true
        FROM products p
        WHERE p.category IS NOT NULL 
          AND TRIM(p.category) <> ''
          AND NOT EXISTS (
            SELECT 1 FROM categories c 
            WHERE LOWER(c.name) = LOWER(p.category) 
              AND (c.tenant_id = p.tenant_id OR c.tenant_id IS NULL)
          );

        UPDATE products p
        SET category_id = (
            SELECT c.id 
            FROM categories c 
            WHERE LOWER(c.name) = LOWER(p.category)
              AND (c.tenant_id = p.tenant_id OR c.tenant_id IS NULL)
            LIMIT 1
        )
        WHERE p.category_id IS NULL;

        ALTER TABLE products DROP COLUMN IF EXISTS category;
    END IF;
END $$;

-- Default any unmapped products to the 'General' category
UPDATE products p
SET category_id = (SELECT id FROM categories WHERE name = 'General' AND tenant_id IS NULL LIMIT 1)
WHERE category_id IS NULL;

