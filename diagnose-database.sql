-- Diagnostic script to check database state
-- Run this in your Supabase SQL Editor

-- Check if user_profiles table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'male_names', 'user_swipes');

-- Check if male_names table has data and uuid_id column
SELECT 
  COUNT(*) as total_names,
  COUNT(uuid_id) as names_with_uuid
FROM male_names;

-- Check if user_profiles table has any data (if it exists)
SELECT COUNT(*) as user_profiles_count
FROM user_profiles;

-- Check current user (if any)
SELECT 
  id,
  email,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
