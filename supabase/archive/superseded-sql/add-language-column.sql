-- Add preferred_language column to user_accessibility_settings
-- Run this in Supabase SQL Editor

ALTER TABLE public.user_accessibility_settings 
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

COMMENT ON COLUMN public.user_accessibility_settings.preferred_language
  IS 'Language preference: en (English) or ms (Bahasa Melayu)';
