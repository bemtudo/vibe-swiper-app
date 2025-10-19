import metaphone
import random

# ====================================================================
# STEP 0: DEFINE FILTERS AND SCORING LOGIC (Based on Deep Research)
# ====================================================================

# Mandated Grapheme Exclusion List (Table 4)
PROBLEM_COMBOS = ['th', 'ph', 'gh', 'ç', 'ş', 'ğ', 'ö', 'ü', 'th', 'ph', 'gh']

def passes_character_filter(name: str) -> bool:
    """Filters names containing problematic Turkish diacritics or English digraphs."""
    lower_name = name.lower()
    # Rigorously exclude all problematic combinations
    if any(combo in lower_name for combo in PROBLEM_COMBOS):
        return False
    # Secondary check for single-character diacritics
    if any(char in lower_name for char in 'ığçşöü'):
        return False
    return True

def calculate_international_vibe_score(name: str) -> int:
    """
    Step 2: Uses Double Metaphone for phonetic scoring and uses the Seed List bonus.
    """
    primary_key, alternate_key = metaphone.doublemetaphone(name)
    score = 0
    
    # 1. Phonetic Consistency Score
    if primary_key and primary_key == alternate_key:
        score += 15
    
    # 2. Simplicity Penalty (Total length of phonetic keys)
    total_length = len(primary_key) + len(alternate_key)
    score -= total_length
    
    # 3. Anchor Bonus (Table 5 - Verified Cross-Cultural Seed List)
    # NOTE: This list should be manually confirmed from the report data.
    SEED_ANCHORS = ['Ali', 'Adem', 'Kaan', 'Deniz', 'Emir', 'Max', 'Leo', 'Roman', 'Milan', 'Kai', 'Soren', 'Felix', 'Aaron', 'Simon']
    if name in SEED_ANCHORS:
        score += 20 # High boost for names validated by the report
        
    return max(0, score) # Ensure score is non-negative

# ====================================================================
# STEP 1: DEFINE DATA INPUT (PASTE YOUR RAW DATA HERE)
# ====================================================================

# NOTE: Populate these variables with the raw Name, Origin, Meaning data 
# from the report's sources (Table 6). Each entry is (Name, Origin, Meaning, Pronunciation).
# Pronunciation can be left as an empty string if the source doesn't provide it.

# TOP 1,000 ENGLISH/US MALE NAMES (Anchor + Discovery)
ENGLISH_DATA_RAW = [
    # Example structure for Top 500 US/UK names (ensure you get ~500 here)
    ('Liam', 'Irish', 'Resolute protector', 'LEE-um'),
    ('Noah', 'Hebrew', 'Rest, comfort', 'NOH-ah'),
    ('Oliver', 'Latin', 'Olive tree planter', 'OL-i-ver'),
    # ... paste the remaining ~497 English names here ...
]

# TOP 1,000 TURKISH MALE NAMES (Anchor + Discovery)
TURKISH_DATA_RAW = [
    # Example structure for Top 500 Turkish names (ensure you get ~500 here)
    ('Mehmet', 'Arabic', 'The praised one', 'meh-MET'),
    ('Yusuf', 'Hebrew/Arabic', 'God increases', 'Yoo-SOOF'),
    ('Ömer', 'Arabic', 'Flourishing, long-lived', 'O-mer'),
    # ... paste the remaining ~497 Turkish names here ...
]

# RAW GLOBAL MALE NAME LIST FOR FILTERING (Target 500+ names from Global Input)
GLOBAL_DATA_RAW = [
    # Example structure for the 500+ candidates for the International Pool.
    # Note: Names with diacritics (like Çağatay, Şahin) should be included here 
    # as the script's character filter will remove them.
    ('Alexander', 'Greek', 'Defending men', 'AL-ix-ander'),
    ('Çağatay', 'Turkish', 'Son of Genghis Khan', 'CHAH-ah-tay'),
    ('Nico', 'Greek', 'Victory of the people', 'NEE-koh'),
    ('Kai', 'Hawaiian', 'Sea, warrior', 'KAI'),
    ('Thaddeus', 'Aramaic', 'Courageous', 'THAD-ee-us'), 
    # ... paste the remaining ~ Global names here ...
]

# ====================================================================
# STEP 3: PROCESSING AND SQL GENERATION LOGIC (UNCHANGED)
# ====================================================================

def generate_sql(english_data, turkish_data, global_data) -> str:
    """Processes all lists and returns a single SQL INSERT statement."""
    sql_entries = []

    # --- A. Process English Names ---
    for name, origin, meaning, pron in english_data:
        # Use simple phonetic guide if not provided, or take what's given
        final_pron = pron if pron else name.lower().replace(' ', '-')
        sql_entries.append(
            f"('{name.replace(\"'\", \"''\")}', 'English', '{origin.replace(\"'\", \"''\")}', '{meaning.replace(\"'\", \"''\")}', '{final_pron.replace(\"'\", \"''\")}', 1)"
        )

    # --- B. Process Turkish Names ---
    for name, origin, meaning, pron in turkish_data:
        final_pron = pron if pron else name.lower().replace(' ', '-')
        sql_entries.append(
            f"('{name.replace(\"'\", \"''\")}', 'Turkish', '{origin.replace(\"'\", \"''\")}', '{meaning.replace(\"'\", \"''\")}', '{final_pron.replace(\"'\", \"''\")}', 1)"
        )

    # --- C. Process International Names (Filtered and Scored) ---
    international_candidates = []

    # 1. Character Set Filtering
    # Note: We must ensure no duplicates are generated from cross-pollination
    existing_names = {entry[0] for entry in english_data + turkish_data}
    
    character_filtered = [item for item in global_data if passes_character_filter(item[0]) and item[0] not in existing_names]

    # 2. Phonetic Scoring
    for name, origin, meaning, pron in character_filtered:
        score = calculate_international_vibe_score(name)
        international_candidates.append({
            'name': name,
            'origin': origin,
            'meaning': meaning,
            'pron': pron,
            'score': score
        })

    # 3. Select Top Names (Target 250, up to 500 if data is available)
    international_candidates.sort(key=lambda x: x['score'], reverse=True)
    final_international_set = international_candidates[:500] 

    for item in final_international_set:
        name = item['name'].replace("'", "''")
        origin = item['origin'].replace("'", "''")
        meaning = item['meaning'].replace("'", "''")
        pron = item['pron'].replace("'", "''")
        score = item['score']

        sql_entries.append(
            f"('{name}', 'International', '{origin}', '{meaning}', '{pron}', {score + 5})"
        )


    # --- D. Final SQL Construction ---
    sql_base = f"""
INSERT INTO male_names (name, name_set, origin, meaning, easy_pronunciation, vibe_score)
VALUES
{",\n".join(sql_entries)}

ON CONFLICT (name) DO NOTHING;
"""
    return sql_base

# --- EXECUTION ---
if __name__ == '__main__':
    final_sql_script = generate_sql(ENGLISH_DATA_RAW, TURKISH_DATA_RAW, GLOBAL_DATA_RAW)
    
    # Save the output to a file that you can easily copy/paste into Supabase
    with open('full_vibe_swiper_names.sql', 'w', encoding='utf-8') as f:
        f.write(final_sql_script)
    
    print("=========================================================")
    print("✅ SQL script 'full_vibe_swiper_names.sql' generated!")
    print(f"Total names prepared for insertion: {len(ENGLISH_DATA_RAW) + len(TURKISH_DATA_RAW) + len(GLOBAL_DATA_RAW)} (before filtering/selection)")
    print("=========================================================")
