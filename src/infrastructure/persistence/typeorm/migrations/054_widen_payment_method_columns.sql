-- Migration 054: Widen payment_method in commercial_documents and sales to support multiple split payment methods
ALTER TABLE commercial_documents ALTER COLUMN payment_method TYPE character varying(255);
ALTER TABLE sales ALTER COLUMN payment_method TYPE character varying(255);
