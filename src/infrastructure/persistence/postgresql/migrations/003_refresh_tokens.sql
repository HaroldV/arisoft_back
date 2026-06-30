-- Migration: Refresh Tokens Schema
-- Author: Amelia (Dev Agent)
-- Date: 2026-06-26

CREATE TABLE REFRESH_TOKENS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON REFRESH_TOKENS(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON REFRESH_TOKENS(token_hash);
