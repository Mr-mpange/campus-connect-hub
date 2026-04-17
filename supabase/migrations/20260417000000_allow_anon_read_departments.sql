-- Allow unauthenticated (anon) users to read active departments
-- This is needed for the signup page department dropdown
CREATE POLICY "Public can view departments" ON public.departments
  FOR SELECT TO anon
  USING (is_active = true);
