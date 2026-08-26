-- Add preferred_font column to user_accessibility_settings
-- Run this in Supabase SQL Editor

ALTER TABLE public.user_accessibility_settings 
ADD COLUMN IF NOT EXISTS preferred_font text DEFAULT 'default';

COMMENT ON COLUMN public.user_accessibility_settings.preferred_font
  IS 'Font preference: default, serif, sans_serif, dyslexia';
