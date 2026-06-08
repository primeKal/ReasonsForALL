-- Migration: Update handle_new_user onboarding trigger to include company_name
-- Date: 2026-06-08

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  extracted_provider text;
BEGIN
  extracted_provider := new.raw_app_meta_data->>'provider';
  IF extracted_provider IS NULL THEN
    extracted_provider := 'email';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, company_name, provider, tenant_id)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company_name',
    extracted_provider,
    'tenant_' || new.id
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
