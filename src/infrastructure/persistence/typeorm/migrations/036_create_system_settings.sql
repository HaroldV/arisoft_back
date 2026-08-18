-- 036_create_system_settings.sql
-- Crea la tabla system_settings para almacenar configuraciones globales de la plataforma SaaS, incluida la Tasa Maestra BCV

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insertar configuración inicial de Tasa Maestra BCV si no existe
INSERT INTO system_settings (key, value, description, updated_at)
VALUES (
    'master_bcv_rate',
    jsonb_build_object(
        'rate', 772.54,
        'source', 'INITIAL_SEED',
        'updated_at', NOW()::text,
        'value_date', NOW()::date::text
    ),
    'Tasa Maestra Global Oficial BCV para toda la plataforma SaaS',
    NOW()
)
ON CONFLICT (key) DO NOTHING;
