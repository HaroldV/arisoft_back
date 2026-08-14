-- Migration 027: Backfill issue_date, valid_until, and payment_method for legacy commercial_documents
UPDATE commercial_documents 
SET issue_date = created_at::date 
WHERE issue_date IS NULL;

UPDATE commercial_documents 
SET valid_until = (created_at + interval '15 days')::date 
WHERE valid_until IS NULL AND document_type != 'DELIVERY_NOTE';

UPDATE commercial_documents 
SET payment_method = 'UNSPECIFIED' 
WHERE payment_method IS NULL;
