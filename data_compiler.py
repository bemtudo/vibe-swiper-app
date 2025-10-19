import csv
from io import StringIO
import random

# ====================================================================
# RAW INPUT DATA (REPLACE PLACEHOLDERS WITH YOUR ACTUAL LIST DATA)
# ====================================================================

# 1. ENGLISH POPULARITY DATA (Name: Rank - e.g., from SSA Top 1000)
# NOTE: This should be read directly from the SSA/ONS source file.
ENGLISH_POPULARITY_RAW = """
Name,Rank
Liam,1
Noah,2
Oliver,3
James,4
Benjamin,5
Ethan,6
Alexander,7
Michael,8
William,9
Lucas,10
Henry,11
Theodore,12
Jack,13
Levi,14
Sebastian,15
Daniel,16
Matthew,17
Luke,18
Asher,19
Mason,20
""" # Add 980 more lines here...

# 2. ENGLISH ETYMOLOGY DATA (Name: (Origin, Meaning) - Merged Dictionary)
# NOTE: This should be derived from the secondary etymological sources (Source 3).
ENGLISH_ETYMOLOGY_RAW = {
    "Liam": ("Irish", "Resolute protector"),
    "Noah": ("Hebrew", "Rest, comfort"),
    "Oliver": ("Latin", "Olive tree planter"),
    "James": ("Hebrew", "Supplanter"),
    "Benjamin": ("Hebrew", "Son of the right hand"),
    "Ethan": ("Hebrew", "Strong, enduring"),
    "Alexander": ("Greek", "Defending men"),
    "Michael": ("Hebrew", "Who is like God?"),
    "William": ("Germanic", "Resolute protector"),
    "Lucas": ("Latin", "Bringer of light"),
    "Henry": ("Germanic", "Home ruler"),
    "Theodore": ("Greek", "Gift of God"),
    "Jack": ("English", "God is gracious"),
    "Levi": ("Hebrew", "Joined, attached"),
    "Sebastian": ("Latin", "Venerable"),
    "Daniel": ("Hebrew", "God is my judge"),
    "Matthew": ("Hebrew", "Gift of God"),
    "Luke": ("Latin", "Light giving"),
    "Asher": ("Hebrew", "Happy, blessed"),
    "Mason": ("English", "Stone worker"),
    # ... add the remaining ~480 names ...
}

# 3. TURKISH POPULARITY DATA (Name: Count - From male_name_tally, Source 5)
# NOTE: This file is large and should be parsed line-by-line.
TURKISH_POPULARITY_RAW = """
Mustafa,1200000
Mehmet,1150000
Ali,980000
Yusuf,700000
Hasan,650000
Ömer,600000
Ahmet,580000
İbrahim,550000
Emre,520000
Burak,500000
""" # Add 990 more lines here...

# 4. TURKISH ETYMOLOGY DATA (Name: (Origin, Meaning) - Dictionary Source, Source 7)
TURKISH_ETYMOLOGY_RAW = {
    "Mustafa": ("Arabic", "The chosen one"),
    "Mehmet": ("Arabic", "The praised one"),
    "Ali": ("Arabic", "Sublime, exalted"),
    "Yusuf": ("Hebrew/Arabic", "God increases"),
    "Hasan": ("Arabic", "Handsome, good"),
    "Ömer": ("Arabic", "Flourishing, long-lived"),
    "Ahmet": ("Arabic", "Most praised"),
    "İbrahim": ("Arabic", "Father of many"),
    "Emre": ("Turkish", "Brother"),
    "Burak": ("Arabic", "Lightning, flash"),
    # ... add the remaining ~490 names ...
}

# 5. RAW GLOBAL NAMES (For International Filtering Base)
# NOTE: You need at least 500 unique names here, ideally 5000+.
GLOBAL_DATA_RAW = [
    # (Name, Origin, Meaning) - We'll fill pronunciation later.
    ("Adrian", "Latin", "Man from Adria"),
    ("Çağatay", "Turkish", "Son of Genghis Khan"),
    ("Nico", "Greek", "Victory of the people"),
    ("Kai", "Hawaiian", "Sea, warrior"),
    ("Soren", "Danish", "Stern"),
    ("Thaddeus", "Aramaic", "Courageous"),
    ("Felix", "Latin", "Lucky, successful"),
    ("Milan", "Slavic", "Gracious, dear"),
    ("Omar", "Arabic", "Eloquent speaker"),
    ("Emil", "Latin", "Rival"),
    ("Ivan", "Slavic", "God is gracious"),
    ("Luca", "Italian", "Bringer of light"),
    ("Max", "Latin", "Greatest"),
    ("Nael", "Arabic/Irish", "To achieve"),
    ("Oscar", "Norse", "God spear"),
    ("Owen", "Welsh", "Noble, well-born"),
    ("Axel", "Scandinavian", "Father of peace"),
    ("Theo", "Greek", "Divine gift"),
    ("Rafael", "Hebrew", "God has healed"),
    ("Zane", "Hebrew", "Gift of God"),
    # ... add 480+ more names ...
]


# ====================================================================
# ETL LOGIC: MERGE AND COMPILE
# ====================================================================

def compile_names(popularity_raw, etymology_dict, name_set_tag) -> list:
    """Performs the ETL merge for one language pool (English or Turkish)."""
    
    # 1. Parse Popularity Data
    popularity_reader = csv.reader(StringIO(popularity_raw), delimiter=',')
    # Skip header
    next(popularity_reader) 
    
    # Use a dictionary for fast lookup by name and enforce the Top 500 cutoff
    popular_names = {}
    rank = 1
    for row in popularity_reader:
        if rank > 500:
            break
        name = row[0].strip()
        popular_names[name] = rank
        rank += 1

    # 2. Merge with Etymology Data
    final_list = []
    
    # We iterate over the ETYMOLOGY dict because it holds the Origin/Meaning
    for name, (origin, meaning) in etymology_dict.items():
        if name in popular_names:
            # Found a match! This completes the entry.
            final_list.append(
                (name, origin, meaning, "") # Empty string for pronunciation placeholder
            )
        
    print(f"--- Compiled {len(final_list)} unique names for {name_set_tag} Pool ---")
    return final_list


# --- Main Execution ---
if __name__ == '__main__':
    
    # --- A. Merge English Data ---
    ENGLISH_FINAL = compile_names(ENGLISH_POPULARITY_RAW, ENGLISH_ETYMOLOGY_RAW, "English")
    
    # --- B. Merge Turkish Data ---
    TURKISH_FINAL = compile_names(TURKISH_POPULARITY_RAW, TURKISH_ETYMOLOGY_RAW, "Turkish")
    
    # --- C. Format Global Data (Requires no merge, just the list) ---
    GLOBAL_FINAL = [(name, origin, meaning, "") for name, origin, meaning in GLOBAL_DATA_RAW]


    print("\n\n#####################################################")
    print("### ✅ RAW DATA COMPILED. COPY VARIABLES BELOW. ###")
    print("#####################################################")
    
    # We print the raw Python list variables needed by generate_full_name_list.py
    
    print("\n--- COPY ENGLISH_DATA_RAW ---")
    print(f"ENGLISH_DATA_RAW = {ENGLISH_FINAL}")
    
    print("\n--- COPY TURKISH_DATA_RAW ---")
    print(f"TURKISH_DATA_RAW = {TURKISH_FINAL}")

    print("\n--- COPY GLOBAL_DATA_RAW ---")
    print(f"GLOBAL_DATA_RAW = {GLOBAL_FINAL}")
