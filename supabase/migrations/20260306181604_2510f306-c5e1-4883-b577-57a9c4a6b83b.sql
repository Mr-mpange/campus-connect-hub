
CREATE TABLE public.ussd_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  phone_number text,
  student_id text,
  user_id uuid,
  menu_selection text,
  request_text text NOT NULL DEFAULT '',
  response_text text NOT NULL,
  session_ended boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view USSD sessions"
  ON public.ussd_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert USSD sessions"
  ON public.ussd_sessions FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_ussd_sessions_student ON public.ussd_sessions(student_id);
CREATE INDEX idx_ussd_sessions_session ON public.ussd_sessions(session_id);
CREATE INDEX idx_ussd_sessions_created ON public.ussd_sessions(created_at DESC);
