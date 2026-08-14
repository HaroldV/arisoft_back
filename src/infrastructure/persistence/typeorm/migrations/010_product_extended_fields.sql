-- Add unit_of_measure, category, variations and advanced_fields to products table
ALTER TABLE products
ADD COLUMN unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'unidades',
ADD COLUMN category VARCHAR(255) NOT NULL DEFAULT 'General',
ADD COLUMN variations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN advanced_fields JSONB DEFAULT '{}'::jsonb;
