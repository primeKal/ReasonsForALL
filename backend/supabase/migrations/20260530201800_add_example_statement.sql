-- Migration: Add example_statement to tenant_configurations
-- Date: 2026-05-30

ALTER TABLE public.tenant_configurations 
ADD COLUMN IF NOT EXISTS example_statement text;
