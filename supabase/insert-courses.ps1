$supabaseUrl = "https://kdlryupwmydirgvxuixd.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbHJ5dXB3bXlkaXJndnh1aXhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEyNDMyNiwiZXhwIjoyMDkzNzAwMzI2fQ.FO2bBBFZR-JiXn0r9e74RgJxMZB29IUY4ykKAwwA_bs"
$adminUserId = "094fd776-0e8f-4523-a727-1d05f6dc0a2c"

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

function New-Course {
    param(
        [string]$Title,
        [string]$Slug,
        [string]$Description,
        [string]$DifficultyLevel,
        [string]$RecommendedAgeGroup,
        [string]$PrimaryDisabilityFocus,
        [array]$SecondaryDisabilityFocuses,
        [array]$AccessibilityCategories,
        [array]$Tags,
        [string]$Category,
        [string]$CourseLayoutType
    )

    $id = [guid]::NewGuid().ToString()

    $body = @{
        id = $id
        created_by = $adminUserId
        title = $Title
        slug = $Slug
        description = $Description
        status = "published"
        difficulty_level = $DifficultyLevel
        course_type = "system"
        system_course = $true
        built_in_course = $true
        created_by_role = "admin"
        recommended_age_group = $RecommendedAgeGroup
        primary_disability_focus = $PrimaryDisabilityFocus
        secondary_disability_focuses = $SecondaryDisabilityFocuses
        accessibility_categories = $AccessibilityCategories
        supports_tts = $true
        supports_transcripts = $true
        supports_focus_mode = $true
        supports_chunked_learning = $true
        accessibility_mode_enabled = $true
        certificate_enabled = $true
        tags = $Tags
        category = $Category
        course_layout_type = $CourseLayoutType
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/courses" -Method POST -Headers $headers -Body $body
        Write-Host "OK: $Title" -ForegroundColor Green
    } catch {
        Write-Host "FAIL: $Title - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "=== DYSLEXIA COURSES (Age 6-12) ===" -ForegroundColor Cyan

New-Course -Title "Phonics Adventures: Sound It Out" -Slug "phonics-adventures" -Description "An interactive phonics course designed for dyslexic learners aged 6-12. Uses multi-sensory approaches with visual letter mapping, audio reinforcement, and tactile exercises to build reading fundamentals." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("cognitive_impairment") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("phonics", "reading", "dyslexia-friendly", "multisensory", "early-literacy") -Category "Literacy" -CourseLayoutType "simplified"

New-Course -Title "Word World: Vocabulary Builder" -Slug "word-world-vocabulary" -Description "Build vocabulary through visual word maps, picture associations, and story-based learning. Specifically designed for dyslexic children with dyslexia-friendly fonts and color-coded syllables." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("cognitive_impairment") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("vocabulary", "reading", "dyslexia-friendly", "visual-learning", "early-literacy") -Category "Literacy" -CourseLayoutType "simplified"

New-Course -Title "Story Sequencer: Reading Comprehension" -Slug "story-sequencer" -Description "Develop reading comprehension through interactive story sequencing. Learners arrange story cards, identify cause-and-effect, and answer questions with visual supports." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("cognitive_impairment") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("reading-comprehension", "storytelling", "dyslexia-friendly", "sequencing", "early-literacy") -Category "Literacy" -CourseLayoutType "simplified"

Write-Host "`n=== DYSLEXIA COURSES (Age 13-17) ===" -ForegroundColor Cyan

New-Course -Title "Study Skills for Dyslexic Teens" -Slug "study-skills-dyslexia-teens" -Description "Evidence-based study strategies for teenagers with dyslexia. Covers note-taking methods, memory techniques, time management, and exam preparation using dyslexia-friendly tools." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("study-skills", "note-taking", "exam-prep", "dyslexia-friendly", "teen") -Category "Academic Skills" -CourseLayoutType "guided"

New-Course -Title "Creative Writing Without Barriers" -Slug "creative-writing-dyslexia" -Description "Express creativity through writing with dyslexia-friendly tools. Learn storytelling, poetry, and essay writing with speech-to-text support, visual prompts, and structured templates." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("creative-writing", "storytelling", "dyslexia-friendly", "expression", "teen") -Category "Language Arts" -CourseLayoutType "guided"

New-Course -Title "Research Skills for Teens" -Slug "research-skills-teens" -Description "Learn how to research effectively with tools designed for dyslexic learners. Covers source evaluation, note organization, citation basics, and presentation skills." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("research", "academic", "dyslexia-friendly", "information-literacy", "teen") -Category "Academic Skills" -CourseLayoutType "guided"

Write-Host "`n=== DYSLEXIA COURSES (Age 18+) ===" -ForegroundColor Cyan

New-Course -Title "Workplace Reading Strategies" -Slug "workplace-reading-strategies" -Description "Master professional reading skills with dyslexia-friendly techniques. Covers email comprehension, report analysis, documentation navigation, and workplace communication." -DifficultyLevel "advanced" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("workplace", "professional", "dyslexia-friendly", "reading", "adult") -Category "Professional Development" -CourseLayoutType "standard"

New-Course -Title "Professional Communication Mastery" -Slug "professional-communication" -Description "Develop confident workplace communication skills. Learn to write clear emails, give presentations, and participate in meetings with dyslexia-friendly strategies and tools." -DifficultyLevel "advanced" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("communication", "professional", "dyslexia-friendly", "presentation", "adult") -Category "Professional Development" -CourseLayoutType "standard"

New-Course -Title "Digital Literacy for Adults" -Slug "digital-literacy-adults" -Description "Build essential digital skills with dyslexia-friendly interfaces. Covers computer basics, internet navigation, online safety, and productivity software." -DifficultyLevel "beginner" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "dyslexia" -SecondaryDisabilityFocuses @("cognitive_impairment") -AccessibilityCategories @("dyslexia", "cognitive") -Tags @("digital-literacy", "technology", "dyslexia-friendly", "computer-basics", "adult") -Category "Technology" -CourseLayoutType "standard"

Write-Host "`n=== ADHD COURSES (Age 6-12) ===" -ForegroundColor Cyan

New-Course -Title "Focus Quest: Attention Training" -Slug "focus-quest-attention" -Description "Gamified attention-building exercises for children with ADHD. Short, engaging activities with immediate rewards, progress tracking, and movement breaks." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("asd") -AccessibilityCategories @("adhd", "cognitive") -Tags @("focus", "attention", "adhd-friendly", "gamification", "early-learning") -Category "Executive Function" -CourseLayoutType "focused"

New-Course -Title "Brain Games: Concentration Boost" -Slug "brain-games-concentration" -Description "Fun brain-training games designed to improve concentration. Includes puzzles, memory games, and pattern recognition with ADHD-friendly pacing and rewards." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("asd") -AccessibilityCategories @("adhd", "cognitive") -Tags @("brain-games", "concentration", "adhd-friendly", "puzzles", "cognitive-training") -Category "Executive Function" -CourseLayoutType "focused"

New-Course -Title "Movement & Learn: Active Education" -Slug "movement-learn-active" -Description "Combine physical movement with learning activities. Designed for kinesthetic learners with ADHD, featuring standing exercises, dance breaks, and hands-on projects." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("asd") -AccessibilityCategories @("adhd", "motor") -Tags @("movement", "kinesthetic", "adhd-friendly", "active-learning", "physical") -Category "Active Learning" -CourseLayoutType "focused"

Write-Host "`n=== ADHD COURSES (Age 13-17) ===" -ForegroundColor Cyan

New-Course -Title "Time Management for Teens" -Slug "time-management-teens" -Description "Master time management with ADHD-friendly tools. Learn to use planners, set priorities, break tasks into chunks, and manage deadlines with visual timers." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("dyslexia") -AccessibilityCategories @("adhd", "cognitive") -Tags @("time-management", "organization", "adhd-friendly", "planning", "teen") -Category "Executive Function" -CourseLayoutType "guided"

New-Course -Title "Study Habits That Stick" -Slug "study-habits-stick" -Description "Build sustainable study habits designed for ADHD brains. Covers spaced repetition, active recall, study environment setup, and motivation techniques." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("dyslexia") -AccessibilityCategories @("adhd", "cognitive") -Tags @("study-habits", "memory", "adhd-friendly", "self-regulation", "teen") -Category "Academic Skills" -CourseLayoutType "guided"

New-Course -Title "Goal Setting Workshop" -Slug "goal-setting-workshop" -Description "Learn to set and achieve meaningful goals. Covers SMART goals, action planning, progress tracking, and overcoming procrastination with ADHD-specific strategies." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("dyslexia") -AccessibilityCategories @("adhd", "cognitive") -Tags @("goal-setting", "motivation", "adhd-friendly", "planning", "teen") -Category "Executive Function" -CourseLayoutType "guided"

Write-Host "`n=== ADHD COURSES (Age 18+) ===" -ForegroundColor Cyan

New-Course -Title "Productivity Systems for Adults" -Slug "productivity-systems-adults" -Description "Discover productivity systems that work for ADHD adults. Covers Getting Things Done, Pomodoro Technique, habit stacking, and digital tools for focus." -DifficultyLevel "advanced" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("dyslexia") -AccessibilityCategories @("adhd", "cognitive") -Tags @("productivity", "systems", "adhd-friendly", "adult", "work-life-balance") -Category "Professional Development" -CourseLayoutType "standard"

New-Course -Title "Career Development Focus" -Slug "career-development-focus" -Description "Navigate your career with ADHD-friendly strategies. Covers resume writing, interview skills, workplace accommodations, and professional growth planning." -DifficultyLevel "advanced" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("dyslexia") -AccessibilityCategories @("adhd", "cognitive") -Tags @("career", "professional", "adhd-friendly", "job-search", "adult") -Category "Professional Development" -CourseLayoutType "standard"

New-Course -Title "Executive Function Training" -Slug "executive-function-training" -Description "Strengthen executive function skills for daily life. Covers planning, organization, emotional regulation, impulse control, and working memory exercises." -DifficultyLevel "advanced" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "adhd" -SecondaryDisabilityFocuses @("asd") -AccessibilityCategories @("adhd", "cognitive") -Tags @("executive-function", "self-regulation", "adhd-friendly", "daily-living", "adult") -Category "Life Skills" -CourseLayoutType "standard"

Write-Host "`n=== ASD COURSES (Age 6-12) ===" -ForegroundColor Cyan

New-Course -Title "Social Skills Playground" -Slug "social-skills-playground" -Description "Learn social skills through interactive scenarios and role-playing. Covers greeting others, sharing, turn-taking, and reading social cues with visual supports." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("social-skills", "communication", "asd-friendly", "role-playing", "early-learning") -Category "Social Skills" -CourseLayoutType "simplified"

New-Course -Title "Pattern World: Visual Learning" -Slug "pattern-world-visual" -Description "Explore mathematics through patterns and visual structures. Ideal for autistic learners who thrive on visual-spatial reasoning and logical patterns." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("patterns", "mathematics", "asd-friendly", "visual-learning", "logic") -Category "Mathematics" -CourseLayoutType "simplified"

New-Course -Title "Routine Builder: Daily Structure" -Slug "routine-builder-daily" -Description "Create and maintain daily routines with visual schedules and checklists. Helps autistic children build predictability and reduce anxiety." -DifficultyLevel "beginner" -RecommendedAgeGroup "6-12" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("routine", "structure", "asd-friendly", "daily-living", "visual-schedule") -Category "Life Skills" -CourseLayoutType "simplified"

Write-Host "`n=== ASD COURSES (Age 13-17) ===" -ForegroundColor Cyan

New-Course -Title "Navigating Social Situations" -Slug "navigating-social-situations" -Description "Learn to navigate complex social situations as a teenager. Covers friendships, group dynamics, conflict resolution, and online social skills." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("social-skills", "friendship", "asd-friendly", "teen", "communication") -Category "Social Skills" -CourseLayoutType "guided"

New-Course -Title "Emotional Regulation Toolkit" -Slug "emotional-regulation-toolkit" -Description "Develop emotional regulation skills with visual emotion cards, coping strategies, and mindfulness exercises designed for autistic teens." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("emotional-regulation", "mindfulness", "asd-friendly", "coping", "teen") -Category "Mental Health" -CourseLayoutType "guided"

New-Course -Title "Transition Planning for Teens" -Slug "transition-planning-teens" -Description "Prepare for life transitions with structured planning. Covers high school to college, independence skills, self-advocacy, and future planning." -DifficultyLevel "intermediate" -RecommendedAgeGroup "13-17" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("transition", "planning", "asd-friendly", "self-advocacy", "teen") -Category "Life Skills" -CourseLayoutType "guided"

Write-Host "`n=== ASD COURSES (Age 18+) ===" -ForegroundColor Cyan

New-Course -Title "Professional Social Skills" -Slug "professional-social-skills" -Description "Master workplace social skills. Covers professional email writing, meeting etiquette, networking, and building professional relationships." -DifficultyLevel "advanced" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("professional", "social-skills", "asd-friendly", "workplace", "adult") -Category "Professional Development" -CourseLayoutType "standard"

New-Course -Title "Independent Living Skills" -Slug "independent-living-skills" -Description "Build essential skills for independent living. Covers cooking, budgeting, time management, household organization, and self-care routines." -DifficultyLevel "advanced" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("independent-living", "daily-living", "asd-friendly", "self-care", "adult") -Category "Life Skills" -CourseLayoutType "standard"

New-Course -Title "Workplace Communication" -Slug "workplace-communication-asd" -Description "Develop effective workplace communication skills. Covers asking for help, giving updates, handling feedback, and collaborating with colleagues." -DifficultyLevel "advanced" -RecommendedAgeGroup "18+" -PrimaryDisabilityFocus "asd" -SecondaryDisabilityFocuses @("adhd") -AccessibilityCategories @("asd", "cognitive") -Tags @("communication", "workplace", "asd-friendly", "collaboration", "adult") -Category "Professional Development" -CourseLayoutType "standard"

Write-Host "`n=== DONE: 27 courses inserted ===" -ForegroundColor Green
