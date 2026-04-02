
ALTER TABLE public.course_allocations 
ADD COLUMN semester text DEFAULT '1',
ADD COLUMN level text DEFAULT 'bachelor';
