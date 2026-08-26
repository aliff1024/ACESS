-- Migration: Add thumbnail_url to h5p_contents
ALTER TABLE public.h5p_contents
ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.h5p_contents OWNER TO postgres;
