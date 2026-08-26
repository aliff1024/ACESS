-- Alter Courses table to support disability-focused UDL rules
ALTER TABLE courses ADD COLUMN IF NOT EXISTS primary_disability_focus text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS secondary_disability_focuses text[] DEFAULT '{}';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_reading_age integer DEFAULT 13;

-- Alter Lessons table to support accessibility overrides and validation scores
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS accessibility_overrides jsonb DEFAULT '{}';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS accessibility_score integer DEFAULT 100;
