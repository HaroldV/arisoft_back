-- Migration: Add fiscal invoice fields to sales
ALTER TABLE sales ADD COLUMN invoice_number VARCHAR NULL;
ALTER TABLE sales ADD COLUMN control_number VARCHAR NULL;
