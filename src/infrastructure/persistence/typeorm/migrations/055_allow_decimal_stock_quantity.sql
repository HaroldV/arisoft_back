-- Migration 055: Allow decimal stock quantity in stocks and items
-- Alter stocks.quantity to NUMERIC(12, 4) to support fractional units of measure (kg, meters, liters, etc.)

ALTER TABLE stocks ALTER COLUMN quantity TYPE NUMERIC(12, 4);

-- Also update sale_items and purchase_items if needed for consistency with fractional quantities
ALTER TABLE sale_items ALTER COLUMN quantity TYPE NUMERIC(12, 4);
ALTER TABLE purchase_items ALTER COLUMN quantity TYPE NUMERIC(12, 4);
