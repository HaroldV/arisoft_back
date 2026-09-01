-- Migration 049: Add audit and cancellation fields to purchase_orders and purchase_reception_notes
-- Rule 8 Compliance: DDL only, backward compatible

ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by_user_id UUID;

ALTER TABLE purchase_reception_notes
ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reversed_by_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_reception_notes_status ON purchase_reception_notes(status);
