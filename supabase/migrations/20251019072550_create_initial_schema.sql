/*
  # Create Baby Name Swiper Database Schema

  1. New Tables
    - `male_names`
      - `uuid_id` (uuid, primary key) - Unique identifier for each name
      - `name` (text) - The actual baby name
      - `name_set` (text) - Pool category: English, Turkish, or International
      - `origin` (text) - Cultural origin of the name
      - `meaning` (text) - Meaning of the name
      - `easy_pronunciation` (text) - Phonetic pronunciation guide
      - `vibe_score` (integer, optional) - Rating or score
      - `created_at` (timestamptz) - Record creation timestamp

    - `user_swipes`
      - `id` (uuid, primary key) - Unique identifier for each swipe
      - `user_id` (uuid, foreign key) - References auth.users
      - `name_id` (uuid, foreign key) - References male_names.uuid_id
      - `swipe_action` (text) - Either 'LIKE' or 'DISLIKE'
      - `pool_used` (text) - Name pool used during swipe
      - `created_at` (timestamptz) - Record creation timestamp

    - `user_profiles`
      - `user_id` (uuid, primary key) - References auth.users
      - `email` (text) - User's email address
      - `partner_id` (uuid, nullable) - References another user for partner matching
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS male_names (
  uuid_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_set text NOT NULL,
  origin text NOT NULL,
  meaning text NOT NULL,
  easy_pronunciation text NOT NULL,
  vibe_score integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name_id uuid REFERENCES male_names(uuid_id) ON DELETE CASCADE NOT NULL,
  swipe_action text NOT NULL CHECK (swipe_action IN ('LIKE', 'DISLIKE')),
  pool_used text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name_id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  partner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE male_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read male names"
  ON male_names FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view own swipes"
  ON user_swipes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own swipes"
  ON user_swipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own swipes"
  ON user_swipes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own swipes"
  ON user_swipes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = partner_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_swipes_user_id ON user_swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_swipes_name_id ON user_swipes(name_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_partner_id ON user_profiles(partner_id);
