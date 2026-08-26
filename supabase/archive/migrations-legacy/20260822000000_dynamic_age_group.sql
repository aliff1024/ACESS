-- Drop the static column and its constraint
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_age_group_check;

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS age_group;

-- Create the virtual computed column function using plpgsql
CREATE OR REPLACE FUNCTION public.age_group(profile public.user_profiles)
RETURNS text 
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN CASE 
    WHEN profile.birth_date IS NULL THEN '18+'
    WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, profile.birth_date::date)) < 13 THEN '6-12'
    WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, profile.birth_date::date)) < 18 THEN '13-17'
    ELSE '18+'
  END;
END;
$$;

COMMENT ON FUNCTION public.age_group(public.user_profiles) IS 'Dynamically calculates age group based on birth_date for PostgREST';
