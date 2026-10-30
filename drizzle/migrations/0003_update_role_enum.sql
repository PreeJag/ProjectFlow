-- Update the app_role enum to include project_manager
-- This migration extends the existing enum

-- First, we need to add the new value to the enum
-- PostgreSQL doesn't support ALTER TYPE ADD VALUE directly in all versions,
-- so we'll recreate the enum

DO $$
BEGIN
    -- Drop the existing enum
    DROP TYPE IF EXISTS public.app_role CASCADE;
    
    -- Recreate with the new value
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'project_manager', 'team_member');
    
    RAISE NOTICE 'app_role enum updated successfully';
END $$;

-- Update the user_roles table to use the new enum
ALTER TABLE public.user_roles 
    ALTER COLUMN role TYPE public.app_role 
    USING role::text::public.app_role;

-- Grant permissions again
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Update the has_role function to accept the new enum values
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;
