-- Fix database schema for Vibe Swiper app
-- Run this in your Supabase SQL Editor

-- Step 1: Add uuid_id column to male_names table
ALTER TABLE male_names 
ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();

-- Step 2: Update existing rows to have uuid_id values
UPDATE male_names 
SET uuid_id = gen_random_uuid() 
WHERE uuid_id IS NULL;

-- Step 3: Make uuid_id NOT NULL
ALTER TABLE male_names 
ALTER COLUMN uuid_id SET NOT NULL;

-- Step 4: Create user_profiles table for partner linking
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  partner_email TEXT,
  partner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create RLS policy for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Step 6: Create trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 8: Add pool_used column to user_swipes if it doesn't exist
ALTER TABLE user_swipes 
ADD COLUMN IF NOT EXISTS pool_used VARCHAR(50);

-- Step 9: Insert sample data (only if table is empty)
INSERT INTO male_names (name, name_set, origin, meaning, easy_pronunciation, vibe_score) 
SELECT * FROM (VALUES
  -- English Names
  ('Alexander', 'English', 'Greek', 'Defender of men', 'al-ig-ZAN-der', 0),
  ('Benjamin', 'English', 'Hebrew', 'Son of the right hand', 'BEN-ja-min', 0),
  ('Christopher', 'English', 'Greek', 'Bearer of Christ', 'KRIS-to-fer', 0),
  ('Daniel', 'English', 'Hebrew', 'God is my judge', 'DAN-yel', 0),
  ('Ethan', 'English', 'Hebrew', 'Strong, firm', 'EE-than', 0),
  ('Gabriel', 'English', 'Hebrew', 'God is my strength', 'GAY-bree-el', 0),
  ('Henry', 'English', 'German', 'Estate ruler', 'HEN-ree', 0),
  ('Isaac', 'English', 'Hebrew', 'He will laugh', 'EYE-zak', 0),
  ('James', 'English', 'Hebrew', 'Supplanter', 'JAYMZ', 0),
  ('Liam', 'English', 'Irish', 'Strong-willed warrior', 'LEE-am', 0),
  ('Matthew', 'English', 'Hebrew', 'Gift of God', 'MATH-yoo', 0),
  ('Nathan', 'English', 'Hebrew', 'He gave', 'NAY-than', 0),
  ('Oliver', 'English', 'Latin', 'Olive tree', 'OL-i-ver', 0),
  ('Samuel', 'English', 'Hebrew', 'Name of God', 'SAM-yoo-el', 0),
  ('William', 'English', 'German', 'Resolute protector', 'WIL-yam', 0),
  
  -- Turkish Names
  ('Mehmet', 'Turkish', 'Arabic', 'Praised one', 'meh-MET', 0),
  ('Ahmet', 'Turkish', 'Arabic', 'Most praised', 'ah-MET', 0),
  ('Mustafa', 'Turkish', 'Arabic', 'Chosen one', 'mus-ta-FA', 0),
  ('Ali', 'Turkish', 'Arabic', 'High, elevated', 'ah-LEE', 0),
  ('Hasan', 'Turkish', 'Arabic', 'Handsome, good', 'ha-SAN', 0),
  ('Hüseyin', 'Turkish', 'Arabic', 'Little handsome one', 'hu-sey-IN', 0),
  ('İbrahim', 'Turkish', 'Arabic', 'Father of many', 'ib-ra-HIM', 0),
  ('İsmail', 'Turkish', 'Arabic', 'God will hear', 'is-ma-IL', 0),
  ('Ömer', 'Turkish', 'Arabic', 'Flourishing, long-lived', 'o-MER', 0),
  ('Osman', 'Turkish', 'Arabic', 'Bone setter', 'os-MAN', 0),
  
  -- International Names
  ('Alejandro', 'International', 'Spanish', 'Defender of men', 'ah-leh-HAN-dro', 10),
  ('Antonio', 'International', 'Spanish', 'Priceless one', 'an-TO-nee-o', 10),
  ('Carlos', 'International', 'Spanish', 'Free man', 'KAR-los', 10),
  ('Diego', 'International', 'Spanish', 'Supplanter', 'dee-AY-go', 10),
  ('Eduardo', 'International', 'Spanish', 'Wealthy guardian', 'eh-DWAR-do', 10),
  ('Fernando', 'International', 'Spanish', 'Bold voyager', 'fer-NAN-do', 10),
  ('Giuseppe', 'International', 'Italian', 'God will add', 'joo-SEP-pe', 10),
  ('Hassan', 'International', 'Arabic', 'Handsome, good', 'ha-SAN', 10),
  ('Ivan', 'International', 'Russian', 'God is gracious', 'ee-VAN', 10),
  ('Jean', 'International', 'French', 'God is gracious', 'ZHAN', 10),
  ('Klaus', 'International', 'German', 'Victory of the people', 'KLOWS', 10),
  ('Lars', 'International', 'Scandinavian', 'Crowned with laurel', 'LARS', 10),
  ('Miguel', 'International', 'Spanish', 'Who is like God', 'mee-GEL', 10),
  ('Nikolai', 'International', 'Russian', 'Victory of the people', 'ni-ko-LAI', 10),
  ('Omar', 'International', 'Arabic', 'Long-lived', 'o-MAR', 10)
) AS v(name, name_set, origin, meaning, easy_pronunciation, vibe_score)
WHERE NOT EXISTS (SELECT 1 FROM male_names LIMIT 1);

-- Step 10: Verify the setup
SELECT 
  'male_names' as table_name,
  COUNT(*) as row_count,
  COUNT(uuid_id) as uuid_count
FROM male_names
UNION ALL
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as row_count,
  COUNT(id) as uuid_count
FROM user_profiles;
