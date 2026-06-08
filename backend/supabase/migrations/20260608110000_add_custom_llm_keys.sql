-- Migration: add custom LLM key configuration to tenant_configurations
ALTER TABLE public.tenant_configurations 
ADD COLUMN IF NOT EXISTS llm_provider text DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS llm_api_key text;
