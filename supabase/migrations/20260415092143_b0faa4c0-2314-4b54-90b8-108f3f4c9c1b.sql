
-- HOD can view profiles in their department
CREATE POLICY "HOD can view department profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'hod'::app_role)
  AND department_id = get_user_department(auth.uid())
);

-- HOD can view user roles for users in their department
CREATE POLICY "HOD can view department user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'hod'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.department_id = get_user_department(auth.uid())
  )
);

-- HOD can view results for courses in their department
CREATE POLICY "HOD can view department results"
ON public.results
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'hod'::app_role)
  AND course_id IN (
    SELECT c.id FROM public.courses c
    WHERE c.department_id = get_user_department(auth.uid())
  )
);

-- Lecturers can view profiles of students they teach
CREATE POLICY "Lecturers can view student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'lecturer'::app_role)
);

-- Update handle_new_user to set default USSD PIN
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;
