
-- Add 'hod' to app_role enum (standalone)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hod';
