-- Migration: Enrich quad store with quantifiers, cardinality, and descriptions
-- Date: 2026-05-30

ALTER TABLE public.tenant_quad_store 
ADD COLUMN IF NOT EXISTS quantifier text,
ADD COLUMN IF NOT EXISTS cardinality_value integer,
ADD COLUMN IF NOT EXISTS description text;
