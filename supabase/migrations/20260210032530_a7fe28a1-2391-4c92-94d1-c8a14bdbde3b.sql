
-- Fix audit_logs INSERT policy to be more restrictive
DROP POLICY "System inserts audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users insert own audit logs" ON public.audit_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());
