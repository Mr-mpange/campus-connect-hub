
-- Add coursework breakdown columns to results
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS test1_score numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS individual_assignment numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS group_assignment numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS university_exam numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS coursework_total numeric DEFAULT NULL;

-- Add year_of_study to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS year_of_study integer DEFAULT NULL;

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  control_number text NOT NULL UNIQUE,
  payment_type text NOT NULL CHECK (payment_type IN ('tuition', 'exam', 'registration', 'retake')),
  amount numeric NOT NULL,
  academic_session text NOT NULL,
  semester text NOT NULL DEFAULT '1',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at timestamp with time zone,
  course_id uuid REFERENCES public.courses(id),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admin can view all payments"
  ON public.payments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HOD can view department payments"
  ON public.payments FOR SELECT
  USING (public.has_role(auth.uid(), 'hod'));

CREATE POLICY "Admin can update payments"
  ON public.payments FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create student_courses table
CREATE TABLE IF NOT EXISTS public.student_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id),
  academic_session text NOT NULL,
  semester text NOT NULL DEFAULT '1',
  year_of_study integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'completed', 'dropped')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id, academic_session)
);

ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own courses"
  ON public.student_courses FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can register courses"
  ON public.student_courses FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admin can manage student courses"
  ON public.student_courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HOD can view department student courses"
  ON public.student_courses FOR SELECT
  USING (public.has_role(auth.uid(), 'hod'));

-- HOD can manage course allocations
CREATE POLICY "HOD can manage course allocations"
  ON public.course_allocations FOR ALL
  USING (public.has_role(auth.uid(), 'hod'));

-- Trigger for payments updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
