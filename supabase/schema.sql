-- ==============================================================================
-- ATTENDANCE PORTAL DATABASE SCHEMA (SIMPLE & FAST)
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create 'students' table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    student_code TEXT NOT NULL UNIQUE,
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_students_student_code ON public.students (student_code);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students (name);

-- 2. Create 'attendance' table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TEXT,
    check_out TEXT,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Leave', 'Half Day')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_attendance_date UNIQUE (student_id, attendance_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance (student_id, attendance_date);

-- 3. DISABLE ROW LEVEL SECURITY (RLS)
-- This ensures you NEVER get "new row violates row-level security policy" errors!
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- 4. Sample initial students
INSERT INTO public.students (name, student_code, phone, active)
VALUES 
    ('Ali Ahmed', 'ST001', '03001234567', true),
    ('Sara Khan', 'ST002', '03009876543', true),
    ('Bilal Hassan', 'ST003', '03112233445', true)
ON CONFLICT (student_code) DO NOTHING;
