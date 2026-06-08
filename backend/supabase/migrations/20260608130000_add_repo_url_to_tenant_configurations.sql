-- Migration: add repo_url to tenant_configurations
-- Date: 2026-06-08

ALTER TABLE public.tenant_configurations
ADD COLUMN IF NOT EXISTS repo_url text;
