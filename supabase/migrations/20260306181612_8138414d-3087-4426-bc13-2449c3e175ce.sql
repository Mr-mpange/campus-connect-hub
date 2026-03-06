
DROP POLICY "Service role can insert USSD sessions" ON public.ussd_sessions;
CREATE POLICY "No direct insert for anon/authenticated"
  ON public.ussd_sessions FOR INSERT
  WITH CHECK (false);
