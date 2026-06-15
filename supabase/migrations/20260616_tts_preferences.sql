-- TTS voice and speed preferences for accessibility settings
ALTER TABLE user_accessibility_settings
  ADD COLUMN IF NOT EXISTS tts_rate REAL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS tts_voice_uri TEXT;

COMMENT ON COLUMN user_accessibility_settings.tts_rate IS 'Speech synthesis rate multiplier (e.g. 0.75, 1.0, 1.5)';
COMMENT ON COLUMN user_accessibility_settings.tts_voice_uri IS 'Browser speechSynthesis voice URI preference';
