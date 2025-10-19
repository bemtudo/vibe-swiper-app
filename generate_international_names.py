import metaphone

# --- 1. Define Problematic Characters and Combinations ---
# Turkish diacritics are auto-removed by metaphone, but we manually filter 
# to catch English phonetic combinations and ensure maximum safety.
PROBLEM_COMBOS = ['th', 'ph', 'gh', 'ç', 'ş', 'ö', 'ü', 'ğ', 'ı']

def passes_character_filter(name: str) -> bool:
    """
    Step 1: Filters out names containing difficult cross-language phonetic combinations.
    """
    lower_name = name.lower()
    if any(combo in lower_name for combo in PROBLEM_COMBOS):
        return False
    return True

# --- 2. Define Phonetic Scoring Logic ---
def calculate_international_vibe_score(name: str) -> int:
    """
    Step 2: Uses the Double Metaphone algorithm to score a name based on 
    phonetic simplicity/universality.
    """
    # Generates two phonetic keys: (Primary, Alternate)
    primary_key, alternate_key = metaphone.doublemetaphone(name)
    
    score = 0
    
    # 1. Phonetic Consistency Score: If the primary and alternate keys are identical,
    # the name has very stable pronunciation, scoring highest.
    if primary_key and primary_key == alternate_key:
        score += 15
    
    # 2. Length/Complexity Penalty: Shorter phonetic codes usually imply simpler, 
    # more universal sounds (e.g., 'Ali' vs 'Christopher').
    # We penalize based on the total length of the keys.
    if primary_key and alternate_key:
        total_length = len(primary_key) + len(alternate_key)
        score -= total_length
    
    # 3. Bonus for International Anchor Names (Optional Manual Seed List)
    # This ensures known good names (like Adam, Leo, Max) rank highly.
    SEED_ANCHORS = ['Adam', 'Ali', 'Leo', 'Max', 'Mira', 'Kian', 'Deniz', 'Luca', 'Nico', 'Ethan', 'Omar', 'Ivan']
    if name in SEED_ANCHORS:
        score += 20
        
    return max(0, score) # Ensure score is non-negative

# =======================================================================
# --- SCRIPT EXECUTION FLOW ---
# =======================================================================

# Placeholder List for Testing (REPLACE with your 5000+ name list)
GLOBAL_NAMES = [
    # English Names
    'Liam', 'Oliver', 'Alexander', 'Benjamin', 'William', 'James', 'Lucas', 'Henry', 'Michael', 'Ethan',
    'Daniel', 'Matthew', 'Jacob', 'Logan', 'Jackson', 'Aiden', 'Theodore', 'Gabriel', 'Leo', 'Jaxon',
    'Wyatt', 'Julian', 'Evan', 'Aaron', 'Adam', 'Adrian', 'Alan', 'Albert', 'Andrew', 'Anthony',
    'Arthur', 'Austin', 'Blake', 'Brandon', 'Brian', 'Caleb', 'Cameron', 'Charles', 'Christopher', 'Colin',
    
    # Turkish Names
    'Mehmet', 'Ahmet', 'Mustafa', 'Ali', 'Hasan', 'Hüseyin', 'İbrahim', 'İsmail', 'Ömer', 'Osman',
    'Süleyman', 'Yusuf', 'Zeynel', 'Emre', 'Can', 'Deniz', 'Kaan', 'Ozan', 'Arda', 'Mert',
    'Efe', 'Tuna', 'Barış', 'Cem', 'Demir', 'Kerem', 'Hakan', 'Eren', 'Onur', 'Alp',
    'Berk', 'Furkan', 'Gökhan', 'İlhan', 'Emir', 'Umut', 'Çağatay', 'Şahin',
    
    # International Names
    'Alejandro', 'Antonio', 'Carlos', 'Diego', 'Eduardo', 'Fernando', 'Giuseppe', 'Hassan', 'Ivan', 'Jean',
    'Klaus', 'Lars', 'Miguel', 'Nikolai', 'Omar', 'Pierre', 'Rafael', 'Sebastian', 'Thomas', 'Viktor',
    'Yuki', 'Zachary', 'Adrian', 'Nico', 'Kai', 'Ezra', 'Felix', 'Milan', 'Emil', 'Luca',
    'Max', 'Nael', 'Oscar', 'Owen', 'Axel', 'Theo', 'Zane', 'Caleb', 'Milo', 'Ellis',
    'Jonas', 'Victor', 'Leo'
]

# 1. Run Character Filtering
character_filtered_names = [name for name in GLOBAL_NAMES if passes_character_filter(name)]

# 2. Run Phonetic Scoring on the remaining names
scored_names = [
    (name, calculate_international_vibe_score(name)) 
    for name in character_filtered_names
]

# 3. Select the Final Pool (e.g., take the top 500)
# Sort by score (descending) and then alphabetically by name (ascending)
final_international_pool = sorted(
    scored_names, 
    key=lambda x: (-x[1], x[0])
)

print("-" * 50)
print(f"Total Names After Character Filter: {len(character_filtered_names)}")
print("-" * 50)

# Output the ranked results to select the top ~500
print("Ranked Names for International Pool (Name, Score):")
for name, score in final_international_pool:
    print(f"  {name}: {score}")

# Example Selection:
TOP_NAMES = [name for name, score in final_international_pool[:50]]  # Top 50 for testing
print(f"\nTop {len(TOP_NAMES)} Names Selected:")
print(TOP_NAMES)
