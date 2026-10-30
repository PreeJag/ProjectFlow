-- Assign admin role to preethikajagadisan@gmail.com
-- This script finds the user by email and assigns them the admin role

-- First, check if the user exists and get their ID
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find the user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'preethikajagadisan@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User preethikajagadisan@gmail.com not found in auth.users';
  ELSE
    -- Check if user already has a role
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
      -- Update existing role to admin
      UPDATE public.user_roles
      SET role = 'admin'
      WHERE user_id = v_user_id;
      RAISE NOTICE 'Updated role to admin for user %', v_user_id;
    ELSE
      -- Insert new admin role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin');
      RAISE NOTICE 'Assigned admin role to user %', v_user_id;
    END IF;
  END IF;
END $$;

-- Verify the assignment
SELECT 
  u.id,
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'preethikajagadisan@gmail.com';
