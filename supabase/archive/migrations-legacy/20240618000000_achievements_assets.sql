-- =====================================================
-- MEDIA ASSETS
-- Global media library for educators and courses
-- =====================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL, -- Nullable, can be general asset
    
    file_name VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL, -- 'image', 'pdf', 'video'
    url VARCHAR NOT NULL,
    size_bytes BIGINT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.media_assets IS 'Global media library for users to reuse assets across the LMS.';

CREATE INDEX IF NOT EXISTS idx_media_assets_user ON public.media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON public.media_assets(file_type);

-- RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own assets" ON public.media_assets;
CREATE POLICY "Users can view their own assets"
    ON public.media_assets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own assets" ON public.media_assets;
CREATE POLICY "Users can insert their own assets"
    ON public.media_assets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own assets" ON public.media_assets;
CREATE POLICY "Users can delete their own assets"
    ON public.media_assets FOR DELETE
    USING (auth.uid() = user_id);


-- =====================================================
-- ACHIEVEMENTS & MILESTONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.course_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    
    name VARCHAR NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR,
    
    requirement_type VARCHAR NOT NULL, -- 'progress', 'lesson', 'activity', 'quiz', 'streak', 'engagement'
    requirement_threshold INTEGER NOT NULL DEFAULT 1, -- e.g., 25 (%), 5 (lessons), 3 (days)
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_req_type CHECK (
        requirement_type IN ('progress', 'lesson', 'activity', 'quiz', 'streak', 'engagement')
    )
);

COMMENT ON TABLE public.course_achievements IS 'Educator-defined achievements/badges for a specific course.';

CREATE INDEX IF NOT EXISTS idx_course_achievements_course ON public.course_achievements(course_id);

-- RLS
ALTER TABLE public.course_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view course achievements" ON public.course_achievements;
CREATE POLICY "Anyone can view course achievements"
    ON public.course_achievements FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Educators can manage achievements for their courses" ON public.course_achievements;
CREATE POLICY "Educators can manage achievements for their courses"
    ON public.course_achievements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_achievements.course_id
            AND courses.created_by = auth.uid()
        )
    );


-- =====================================================
-- USER ACHIEVEMENTS
-- Tracks which users have earned which badges
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.course_achievements(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (user_id, achievement_id)
);

COMMENT ON TABLE public.user_achievements IS 'Tracks the achievements earned by learners.';

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_course ON public.user_achievements(course_id);

-- RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements"
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Educators can view achievements for their courses" ON public.user_achievements;
CREATE POLICY "Educators can view achievements for their courses"
    ON public.user_achievements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = user_achievements.course_id
            AND courses.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Learners can insert achievements" ON public.user_achievements;
CREATE POLICY "Learners can insert achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);
