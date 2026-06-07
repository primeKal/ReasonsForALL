-- Migration: add tenant_text_policies table for natural-language business policy storage
CREATE TABLE IF NOT EXISTS public.tenant_text_policies (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         TEXT NOT NULL,
    server_config_id  BIGINT NOT NULL REFERENCES public.tenant_configurations(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    body              TEXT NOT NULL,
    source_type       TEXT NOT NULL DEFAULT 'trigger',  -- 'trigger' | 'function' | 'inferred'
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_text_policies_server ON public.tenant_text_policies(tenant_id, server_config_id);
