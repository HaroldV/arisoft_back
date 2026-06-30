-- Migration: Password Reset Tokens Schema
-- Author: Amelia (Dev Agent)
-- Date: 2026-06-26

CREATE TABLE PASSWORD_RESET_TOKENS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_tokens_email ON PASSWORD_RESET_TOKENS(email);
CREATE INDEX idx_password_reset_tokens_hash ON PASSWORD_RESET_TOKENS(token_hash);
