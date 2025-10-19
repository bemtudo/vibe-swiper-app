-- Essential database setup for Vibe Swiper
-- Run this in your Supabase SQL Editor

-- Step 1: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  partner_email TEXT,
  partner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS and create policy
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view and update their own profile" ON user_profiles;

-- Create new policy
CREATE POLICY "Users can view and update their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Step 3: Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 5: Create user profile for existing users (if any)
INSERT INTO user_profiles (id, email)
SELECT id, email 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Verify setup
SELECT 'user_profiles table created successfully' as status;
SELECT COUNT(*) as user_profiles_count FROM user_profiles;
