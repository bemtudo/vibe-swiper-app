import metaphone
import random

# ====================================================================
# STEP 1: DEFINE FILTERS AND SCORING LOGIC (Using your defined rules)
# ====================================================================

# Problematic characters/combinations that sound ambiguous across Turkish/English
PROBLEM_COMBOS = ['th', 'ph', 'gh', 'ç', 'ş', 'ğ', 'ö', 'ü']

def passes_character_filter(name: str) -> bool:
    """Filters names with characters that cause primary phonetic conflicts."""
    lower_name = name.lower()
    if any(combo in lower_name for combo in PROBLEM_COMBOS):
        return False
    # Check for diacritics that may have been missed (metaphone might handle some)
    if any(char in lower_name for char in 'ığçşöü'):
        return False
    return True

def calculate_international_vibe_score(name: str) -> int:
    """
    Uses Double Metaphone for phonetic scoring.
    """
    primary_key, alternate_key = metaphone.doublemetaphone(name)
    score = 0
    
    if primary_key and primary_key == alternate_key:
        score += 15
    
    # Penalize complexity
    total_length = len(primary_key) + len(alternate_key)
    score -= total_length
    
    # Anchor Bonus for proven cross-cultural names (from Table 5 of your report)
    SEED_ANCHORS = ['Ali', 'Adem', 'Kaan', 'Deniz', 'Emir', 'Max', 'Leo', 'Roman', 'Kai', 'Felix']
    if name in SEED_ANCHORS:
        score += 20
        
    return max(0, score)


# ====================================================================
# STEP 2: PASTE YOUR COMPILED LISTS HERE (RAW INPUT)
# ====================================================================

# NOTE: Paste the best single list for English (~500 names) here. 
# Format: (Name, Origin, Meaning, Easy Pronunciation)
ENGLISH_DATA = [
    # Replace this with ~500 names from your best English source (e.g., Pampers Top 500)
    ('Liam', 'Irish', 'Resolute protector', 'LEE-um'),
    ('Noah', 'Hebrew', 'Rest, comfort', 'NOH-ah'),
    ('Oliver', 'Latin', 'Olive tree planter', 'OL-i-ver'),
    ('James', 'Hebrew', 'Supplanter', 'JAYMZ'),
    ('Benjamin', 'Hebrew', 'Son of the right hand', 'BEN-ja-min'),
    ('Ethan', 'Hebrew', 'Strong, enduring', 'EE-than'),
    ('Alexander', 'Greek', 'Defending men', 'AL-ig-ZAN-der'),
    ('Michael', 'Hebrew', 'Who is like God?', 'MY-kel'),
    ('William', 'Germanic', 'Resolute protector', 'WIL-yam'),
    ('Lucas', 'Latin', 'Bringer of light', 'LOO-kas'),
    ('Henry', 'Germanic', 'Home ruler', 'HEN-ree'),
    ('Theodore', 'Greek', 'Gift of God', 'THEE-o-dor'),
    ('Jack', 'English', 'God is gracious', 'JAK'),
    ('Levi', 'Hebrew', 'Joined, attached', 'LEE-vy'),
    ('Sebastian', 'Latin', 'Venerable', 'se-BAS-chan'),
    ('Daniel', 'Hebrew', 'God is my judge', 'DAN-yel'),
    ('Matthew', 'Hebrew', 'Gift of God', 'MATH-yoo'),
    ('Luke', 'Latin', 'Light giving', 'LOOK'),
    ('Asher', 'Hebrew', 'Happy, blessed', 'ASH-er'),
    ('Mason', 'English', 'Stone worker', 'MAY-son'),
    # ... Add approximately 480 more English names ...
]

# NOTE: Paste the best single list for Turkish (~500 names) here.
TURKISH_DATA = [
    # Replace this with ~500 names from your best Turkish dictionary source
    ('Mehmet', 'Arabic', 'The praised one', 'meh-MET'),
    ('Mustafa', 'Arabic', 'The chosen one', 'MOOS-ta-fa'),
    ('Yusuf', 'Hebrew/Arabic', 'God increases', 'Yoo-SOOF'),
    ('Ali', 'Arabic', 'Sublime, exalted', 'ah-LEE'),
    ('Hasan', 'Arabic', 'Handsome, good', 'ha-SAN'),
    ('Ömer', 'Arabic', 'Flourishing, long-lived', 'o-MER'),
    ('Ahmet', 'Arabic', 'Most praised', 'ah-MET'),
    ('İbrahim', 'Arabic', 'Father of many', 'ib-ra-HIM'),
    ('Emre', 'Turkish', 'Brother', 'em-RE'),
    ('Burak', 'Arabic', 'Lightning, flash', 'boo-RAK'),
    # ... Add approximately 490 more Turkish names ...
]

# NOTE: Paste the largest raw GLOBAL list here (~500+ names). This list will be filtered.
GLOBAL_DATA = [
    # Replace this with 500+ names from your Global List/Global Name Dataset
    ('Alexander', 'Greek', 'Defending men', 'AL-ix-ander'),
    ('Çağatay', 'Turkish', 'Son of Genghis Khan', 'CHAH-ah-tay'), # Script will filter this out
    ('Nico', 'Greek', 'Victory of the people', 'NEE-koh'),
    ('Kai', 'Hawaiian', 'Sea, warrior', 'KAI'),
    ('Thaddeus', 'Aramaic', 'Courageous', 'THAD-ee-us'), # Script will filter this out
    ('Soren', 'Danish', 'Stern', 'SOAR-en'),
    ('Felix', 'Latin', 'Lucky, successful', 'FEE-lix'),
    ('Milan', 'Slavic', 'Gracious, dear', 'MEE-lan'),
    ('Omar', 'Arabic', 'Eloquent speaker', 'o-MAR'),
    ('Emil', 'Latin', 'Rival', 'e-MEEL'),
    ('Ivan', 'Slavic', 'God is gracious', 'ee-VAN'),
    ('Luca', 'Italian', 'Bringer of light', 'LOO-ka'),
    ('Max', 'Latin', 'Greatest', 'MAKS'),
    ('Nael', 'Arabic/Irish', 'To achieve', 'nah-EL'),
    ('Oscar', 'Norse', 'God spear', 'OS-kar'),
    ('Owen', 'Welsh', 'Noble, well-born', 'OH-wen'),
    ('Axel', 'Scandinavian', 'Father of peace', 'AK-sel'),
    ('Theo', 'Greek', 'Divine gift', 'THEE-o'),
    ('Rafael', 'Hebrew', 'God has healed', 'raf-ah-EL'),
    ('Zane', 'Hebrew', 'Gift of God', 'ZAYN'),
    # ... Add approximately 480 more global names ...
]


# ====================================================================
# STEP 3: PROCESSING AND SQL GENERATION LOGIC (Execution)
# ====================================================================

def generate_sql(english_data, turkish_data, global_data) -> str:
    """Processes all lists and returns a single SQL INSERT statement."""
    sql_entries = []
    
    # Set to track all names used to prevent duplicates
    existing_names = set()

    # --- A. Process English Names (Direct Insertion) ---
    for name, origin, meaning, pron in english_data:
        existing_names.add(name)
        final_pron = pron if pron else name.lower().replace(' ', '')
        sql_entries.append(
            f"('{name.replace(\"'\", \"''\")}', 'English', '{origin.replace(\"'\", \"''\")}', '{meaning.replace(\"'\", \"''\")}', '{final_pron.replace(\"'\", \"''\")}', 1)"
        )

    # --- B. Process Turkish Names (Direct Insertion) ---
    for name, origin, meaning, pron in turkish_data:
        existing_names.add(name)
        final_pron = pron if pron else name.lower().replace(' ', '')
        sql_entries.append(
            f"('{name.replace(\"'\", \"''\")}', 'Turkish', '{origin.replace(\"'\", \"''\")}', '{meaning.replace(\"'\", \"''\")}', '{final_pron.replace(\"'\", \"''\")}', 1)"
        )

    # --- C. Process International Names (Filtered and Scored) ---
    international_candidates = []

    # 1. Character Set Filtering + Deduplication
    character_filtered = [
        item for item in global_data 
        if passes_character_filter(item[0]) and item[0] not in existing_names
    ]

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

    # 3. Select Top Names (Target 250-500)
    international_candidates.sort(key=lambda x: x['score'], reverse=True)
    
    # Limit to the highest scoring 500 names
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
    final_sql_script = generate_sql(ENGLISH_DATA, TURKISH_DATA, GLOBAL_DATA)
    
    # Save the output to a file
    with open('final_vibe_swiper_names.sql', 'w', encoding='utf-8') as f:
        f.write(final_sql_script)
    
    print("=========================================================")
    print("✅ FINAL SQL script 'final_vibe_swiper_names.sql' generated!")
    print(f"Total names inserted: {len(ENGLISH_DATA) + len(TURKISH_DATA) + len(final_international_set)}")
    print("=========================================================")
