-- Migration: Create tenant_api_logs table for verification API audit trails
CREATE TABLE IF NOT EXISTS public.tenant_api_logs (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         TEXT NOT NULL,
    server_config_id  BIGINT NOT NULL REFERENCES public.tenant_configurations(id) ON DELETE CASCADE,
    agent_intent      TEXT NOT NULL,
    payload           JSONB NOT NULL,
    is_valid          BOOLEAN NOT NULL,
    violations        TEXT[] NOT NULL DEFAULT '{}',
    inference_time_ms NUMERIC NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_server ON public.tenant_api_logs(tenant_id, server_config_id);
