-- ─── Instructor Applications & Contact System ─────────────────────────────

-- 1. Instructor Applications Table
CREATE TABLE IF NOT EXISTS instructor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  experience TEXT,
  reason TEXT,
  portfolio_links TEXT,
  referral_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'request_info')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'technical', 'instructor_application', 'accessibility', 'feedback')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Referral Codes Table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_instructor_applications_status ON instructor_applications(status);
CREATE INDEX IF NOT EXISTS idx_instructor_applications_user_id ON instructor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- RLS
ALTER TABLE instructor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Instructor applications: user can read own, admin can read all
DROP POLICY IF EXISTS "Users can view own applications" ON instructor_applications;
CREATE POLICY "Users can view own applications" ON instructor_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own application" ON instructor_applications;
CREATE POLICY "Users can insert own application" ON instructor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all applications" ON instructor_applications;
CREATE POLICY "Admins can view all applications" ON instructor_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Contact messages: anyone can insert, only admin can read
DROP POLICY IF EXISTS "Anyone can submit contact message" ON contact_messages;
CREATE POLICY "Anyone can submit contact message" ON contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
CREATE POLICY "Admins can view contact messages" ON contact_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Referral codes: users can view their own, admins can view all
DROP POLICY IF EXISTS "Users can view own referral codes" ON referral_codes;
CREATE POLICY "Users can view own referral codes" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert referral codes" ON referral_codes;
CREATE POLICY "Users can insert referral codes" ON referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all referral codes" ON referral_codes;
CREATE POLICY "Admins can view all referral codes" ON referral_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Add instructor_application_status to users table (for tracking who applied)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'instructor_application_status'
  ) THEN
    ALTER TABLE users ADD COLUMN instructor_application_status TEXT DEFAULT NULL;
  END IF;
END $$;
