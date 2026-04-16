
-- Fix handle_new_user to NOT auto-insert student role when created by admin
-- The admin-create-user edge function handles role assignment separately
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, student_id, department_id, ussd_pin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'student_id',
    CASE 
      WHEN NEW.raw_user_meta_data->>'department_id' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'department_id' != ''
      THEN (NEW.raw_user_meta_data->>'department_id')::uuid
      ELSE NULL
    END,
    '1234'
  );

  -- Only auto-assign student role for self-signups (no created_by_admin flag)
  IF NEW.raw_user_meta_data->>'created_by_admin' IS NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Clean up existing duplicate student roles for non-student users
DELETE FROM public.user_roles 
WHERE role = 'student' 
AND user_id IN (
  SELECT user_id FROM public.user_roles 
  WHERE role IN ('admin', 'hod', 'lecturer')
);
