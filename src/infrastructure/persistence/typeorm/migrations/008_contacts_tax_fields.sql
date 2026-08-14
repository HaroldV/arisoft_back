-- Add zone_code and taxpayer_type to clients table
ALTER TABLE clients 
ADD COLUMN zone_code VARCHAR(3) DEFAULT 'DC',
ADD COLUMN taxpayer_type VARCHAR(20) DEFAULT 'EXEMPT';

-- Add zone_code and taxpayer_type to providers table
ALTER TABLE providers 
ADD COLUMN zone_code VARCHAR(3) DEFAULT 'DC',
ADD COLUMN taxpayer_type VARCHAR(20) DEFAULT 'ORDINARY';
