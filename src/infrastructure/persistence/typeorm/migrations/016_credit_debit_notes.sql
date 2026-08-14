CREATE TABLE tenant_fiscal_ranges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN ('INVOICE', 'NOTE')),
    start_number INTEGER NOT NULL,
    end_number INTEGER NOT NULL,
    current_number INTEGER NOT NULL,
    authorization_number VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_fiscal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    original_invoice_id UUID NOT NULL REFERENCES sales(id),
    document_number VARCHAR NOT NULL,
    control_number VARCHAR NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    reason_code VARCHAR NOT NULL CHECK (reason_code IN ('RETURN', 'DISCOUNT', 'PRICE_ERR', 'TAX_ERR', 'OTHER')),
    reason_description TEXT,
    currency VARCHAR NOT NULL,
    exchange_rate NUMERIC(10, 4) NOT NULL,
    subtotal_usd NUMERIC(15, 4) NOT NULL,
    tax_amount_usd NUMERIC(15, 4) NOT NULL,
    total_usd NUMERIC(15, 4) NOT NULL,
    subtotal_ves NUMERIC(15, 4) NOT NULL,
    tax_amount_ves NUMERIC(15, 4) NOT NULL,
    total_ves NUMERIC(15, 4) NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_fiscal_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES sales_fiscal_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR NOT NULL,
    quantity NUMERIC(15, 4) NOT NULL,
    unit_price_usd NUMERIC(15, 4) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL,
    tax_amount_usd NUMERIC(15, 4) NOT NULL,
    total_usd NUMERIC(15, 4) NOT NULL,
    subtotal_ves NUMERIC(15, 4) NOT NULL,
    tax_amount_ves NUMERIC(15, 4) NOT NULL,
    total_ves NUMERIC(15, 4) NOT NULL
);

CREATE TABLE purchase_fiscal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    original_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id),
    document_number VARCHAR NOT NULL,
    control_number VARCHAR NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    reason_code VARCHAR NOT NULL CHECK (reason_code IN ('RETURN', 'DISCOUNT', 'PRICE_ERR', 'TAX_ERR', 'OTHER')),
    reason_description TEXT,
    currency VARCHAR NOT NULL,
    exchange_rate NUMERIC(10, 4) NOT NULL,
    subtotal_usd NUMERIC(15, 4) NOT NULL,
    tax_amount_usd NUMERIC(15, 4) NOT NULL,
    total_usd NUMERIC(15, 4) NOT NULL,
    subtotal_ves NUMERIC(15, 4) NOT NULL,
    tax_amount_ves NUMERIC(15, 4) NOT NULL,
    total_ves NUMERIC(15, 4) NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('POSTED', 'CANCELLED')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_fiscal_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES purchase_fiscal_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR NOT NULL,
    quantity NUMERIC(15, 4) NOT NULL,
    unit_price_usd NUMERIC(15, 4) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL,
    tax_amount_usd NUMERIC(15, 4) NOT NULL,
    total_usd NUMERIC(15, 4) NOT NULL,
    subtotal_ves NUMERIC(15, 4) NOT NULL,
    tax_amount_ves NUMERIC(15, 4) NOT NULL,
    total_ves NUMERIC(15, 4) NOT NULL
);

CREATE TABLE fiscal_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    event_type VARCHAR NOT NULL,
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR NOT NULL,
    hash_checksum VARCHAR NOT NULL
);
