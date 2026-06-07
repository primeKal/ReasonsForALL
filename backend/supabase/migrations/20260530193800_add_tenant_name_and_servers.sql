-- Migration: Add tenant server name, dialect, and support multiple database servers
-- Date: 2026-05-30

-- 1. Remove the unique constraint on tenant_configurations.tenant_id so a tenant can connect multiple servers
-- Supabase automatically names this constraint based on the column name
ALTER TABLE public.tenant_configurations 
DROP CONSTRAINT IF EXISTS tenant_configurations_tenant_id_key;

-- 2. Add columns to tenant_configurations to represent connected servers
ALTER TABLE public.tenant_configurations 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS server_key text,
ADD COLUMN IF NOT EXISTS dialect text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Connected',
ADD COLUMN IF NOT EXISTS rules_extracted integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 3. Add server_config_id foreign key column to tenant_quad_store
ALTER TABLE public.tenant_quad_store 
ADD COLUMN IF NOT EXISTS server_config_id bigint REFERENCES public.tenant_configurations(id) ON DELETE CASCADE;

-- Create an index on server_config_id for optimal querying performance
CREATE INDEX IF NOT EXISTS idx_quad_store_server_config ON public.tenant_quad_store(server_config_id);

-- 4. Update the onboarding trigger function so it doesn't insert a blank tenant_configuration row on new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  extracted_provider text;
BEGIN
  extracted_provider := new.raw_app_meta_data->>'provider';
  IF extracted_provider IS NULL THEN
    extracted_provider := 'email';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, provider, tenant_id)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    extracted_provider,
    'tenant_' || new.id
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
