-- Updated database schema to match Gemini's approach
-- Run this in your Supabase SQL Editor

-- First, let's update the male_names table structure
ALTER TABLE male_names 
ADD COLUMN IF NOT EXISTS origin VARCHAR(100),
ADD COLUMN IF NOT EXISTS meaning TEXT,
ALTER COLUMN easy_pronunciation TYPE VARCHAR(100);

-- Update the user_swipes table to include pool_used
ALTER TABLE user_swipes 
ADD COLUMN IF NOT EXISTS pool_used VARCHAR(50);

-- Insert comprehensive sample data with proper schema
INSERT INTO male_names (name, name_set, origin, meaning, easy_pronunciation) VALUES
-- English Names
('Alexander', 'English', 'Greek', 'Defender of men', 'al-ig-ZAN-der'),
('Benjamin', 'English', 'Hebrew', 'Son of the right hand', 'BEN-ja-min'),
('Christopher', 'English', 'Greek', 'Bearer of Christ', 'KRIS-to-fer'),
('Daniel', 'English', 'Hebrew', 'God is my judge', 'DAN-yel'),
('Ethan', 'English', 'Hebrew', 'Strong, firm', 'EE-than'),
('Gabriel', 'English', 'Hebrew', 'God is my strength', 'GAY-bree-el'),
('Henry', 'English', 'German', 'Estate ruler', 'HEN-ree'),
('Isaac', 'English', 'Hebrew', 'He will laugh', 'EYE-zak'),
('James', 'English', 'Hebrew', 'Supplanter', 'JAYMZ'),
('Liam', 'English', 'Irish', 'Strong-willed warrior', 'LEE-am'),
('Matthew', 'English', 'Hebrew', 'Gift of God', 'MATH-yoo'),
('Nathan', 'English', 'Hebrew', 'He gave', 'NAY-than'),
('Oliver', 'English', 'Latin', 'Olive tree', 'OL-i-ver'),
('Samuel', 'English', 'Hebrew', 'Name of God', 'SAM-yoo-el'),
('William', 'English', 'German', 'Resolute protector', 'WIL-yam'),

-- Turkish Names
('Mehmet', 'Turkish', 'Arabic', 'Praised one', 'meh-MET'),
('Ahmet', 'Turkish', 'Arabic', 'Most praised', 'ah-MET'),
('Mustafa', 'Turkish', 'Arabic', 'Chosen one', 'mus-ta-FA'),
('Ali', 'Turkish', 'Arabic', 'High, elevated', 'ah-LEE'),
('Hasan', 'Turkish', 'Arabic', 'Handsome, good', 'ha-SAN'),
('Hüseyin', 'Turkish', 'Arabic', 'Little handsome one', 'hu-sey-IN'),
('İbrahim', 'Turkish', 'Arabic', 'Father of many', 'ib-ra-HIM'),
('İsmail', 'Turkish', 'Arabic', 'God will hear', 'is-ma-IL'),
('Ömer', 'Turkish', 'Arabic', 'Flourishing, long-lived', 'o-MER'),
('Osman', 'Turkish', 'Arabic', 'Bone setter', 'os-MAN'),
('Süleyman', 'Turkish', 'Hebrew', 'Peace', 'sul-ley-MAN'),
('Yusuf', 'Turkish', 'Hebrew', 'God will increase', 'yu-SUF'),
('Zeynel', 'Turkish', 'Arabic', 'Beautiful ornament', 'zey-NEL'),
('Emre', 'Turkish', 'Turkish', 'Brother', 'em-RE'),
('Can', 'Turkish', 'Turkish', 'Soul, life', 'JAN'),

-- International Names
('Alejandro', 'International', 'Spanish', 'Defender of men', 'ah-leh-HAN-dro'),
('Antonio', 'International', 'Spanish', 'Priceless one', 'an-TO-nee-o'),
('Carlos', 'International', 'Spanish', 'Free man', 'KAR-los'),
('Diego', 'International', 'Spanish', 'Supplanter', 'dee-AY-go'),
('Eduardo', 'International', 'Spanish', 'Wealthy guardian', 'eh-DWAR-do'),
('Fernando', 'International', 'Spanish', 'Bold voyager', 'fer-NAN-do'),
('Giuseppe', 'International', 'Italian', 'God will add', 'joo-SEP-pe'),
('Hassan', 'International', 'Arabic', 'Handsome, good', 'ha-SAN'),
('Ivan', 'International', 'Russian', 'God is gracious', 'ee-VAN'),
('Jean', 'International', 'French', 'God is gracious', 'ZHAN'),
('Klaus', 'International', 'German', 'Victory of the people', 'KLOWS'),
('Lars', 'International', 'Scandinavian', 'Crowned with laurel', 'LARS'),
('Miguel', 'International', 'Spanish', 'Who is like God', 'mee-GEL'),
('Nikolai', 'International', 'Russian', 'Victory of the people', 'ni-ko-LAI'),
('Omar', 'International', 'Arabic', 'Long-lived', 'o-MAR'),
('Pierre', 'International', 'French', 'Rock, stone', 'pee-ER'),
('Rafael', 'International', 'Spanish', 'God has healed', 'ra-fa-EL'),
('Sebastian', 'International', 'Latin', 'Venerable', 'se-BAS-tee-an'),
('Thomas', 'International', 'Aramaic', 'Twin', 'TOM-as'),
('Viktor', 'International', 'Russian', 'Conqueror', 'vik-TOR'),
('Yuki', 'International', 'Japanese', 'Snow', 'YOO-kee'),
('Zachary', 'International', 'Hebrew', 'Remembered by God', 'ZAK-a-ree');
