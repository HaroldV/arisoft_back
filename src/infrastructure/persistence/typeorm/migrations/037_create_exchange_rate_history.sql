-- 037_create_exchange_rate_history.sql
-- Crea la tabla de auditoría exchange_rate_history para registrar el histórico de cada cambio de tasas oficiales

CREATE TABLE IF NOT EXISTS exchange_rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency VARCHAR(10) NOT NULL, -- 'USD' | 'EUR'
    rate NUMERIC(14, 4) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'AUTO_SCRAPING' | 'MANUAL' | 'INITIAL_SEED'
    execution_slot VARCHAR(50), -- 'MORNING' | 'EVENING' | 'MANUAL_OVERRIDE'
    value_date VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_curr_date ON exchange_rate_history(currency, created_at DESC);
