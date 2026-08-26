-- Migration: Extend h5p_contents and add h5p_responses for self-hosted H5P
-- Author: Antigravity

-- 1. Extend public.h5p_contents table
ALTER TABLE public.h5p_contents
ADD COLUMN IF NOT EXISTS h5p_mode text DEFAULT 'external',
ADD COLUMN IF NOT EXISTS library_name text,
ADD COLUMN IF NOT EXISTS content_json jsonb,
ADD COLUMN IF NOT EXISTS folder_path text;

-- Add index to support fast queries by mode
CREATE INDEX IF NOT EXISTS idx_h5p_contents_mode ON public.h5p_contents (h5p_mode);

-- 2. Create h5p_responses table for xAPI tracking
CREATE TABLE IF NOT EXISTS public.h5p_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    h5p_content_id uuid NOT NULL REFERENCES public.h5p_contents(id) ON DELETE CASCADE,
    score integer,
    max_score integer,
    completed boolean DEFAULT false,
    raw_statement jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.h5p_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "users_insert_own_responses" ON public.h5p_responses;
DROP POLICY IF EXISTS "users_view_own_responses" ON public.h5p_responses;

-- RLS Policies
CREATE POLICY "users_insert_own_responses" ON public.h5p_responses
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_view_own_responses" ON public.h5p_responses
    FOR SELECT TO authenticated USING (
        auth.uid() = user_id OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'educator')
        )
    );

ALTER TABLE public.h5p_responses OWNER TO postgres;
