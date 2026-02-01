import json
import re
import math
from collections import Counter
from datetime import datetime
import os

# --- 1. Configuration & Constants ---
STOPWORDS = set([
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", 
    "em", "no", "na", "nos", "nas", "por", "pelo", "pela", "pelos", "pelas", "para", 
    "com", "sem", "e", "ou", "se", "como", "mas", "que", "foi", "foram", "é", "são", 
    "ser", "estar", "ter", "haver", "sobre", "entre", "até", "após", "durante", 
    "-", "|", "&", "times", "union", "journal", "blooberg", "reuters", "cnn", 
    "the", "of", "and", "in", "to", "for", "on", "with", "at", "by", "from", "up", "about", 
    "into", "over", "after"
])

def clean_text(text):
    if not text: return ""
    # Remove source suffixes often found in Google News titles (e.g. " - Name of Source")
    text = re.sub(r' - [^-]+$', '', text) 
    text = re.sub(r' \| [^|]+$', '', text)
    
    # Lowercase and remove punctuation
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # Tokenize
    tokens = text.split()
    
    # Remove stopwords
    clean_tokens = [t for t in tokens if t not in STOPWORDS and len(t) > 2]
    
    return clean_tokens

def compute_tf_similarity(tokens1, tokens2):
    if not tokens1 or not tokens2: 
        return 0.0
    
    set1 = set(tokens1)
    set2 = set(tokens2)
    
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    if union == 0: return 0.0
    
    # Jaccard Similarity on "Bag of Words" model
    return intersection / union

def get_hours_diff(date_str1, date_str2):
    try:
        # Parse ISO strings. 
        # Note: Python < 3.7 might struggle with 'Z', assuming robust ISO parsing or removing Z
        d1 = datetime.fromisoformat(date_str1.replace('Z', '+00:00'))
        d2 = datetime.fromisoformat(date_str2.replace('Z', '+00:00'))
        diff = abs((d1 - d2).total_seconds()) / 3600.0
        return diff
    except Exception as e:
        return 0.0 # Fallback: assume same time if parse fails

def apply_time_decay(score, hours_diff):
        # Decay formula: 1 / (1 + hours/36)
        # Using 36h half-life to be less aggressive with slightly older but relevant news
        decay = 1.0 / (1.0 + (hours_diff / 36.0))
        return score * decay

# --- 2. Load Data ---
file_path = "/Users/thiagobvilar/Documents/meupainel/alerts_sample.json"
if not os.path.exists(file_path):
    print("Error: alerts_sample.json not found.")
    exit(1)

with open(file_path, 'r') as f:
    alerts = json.load(f)

# Preprocess
processed_alerts = []
for a in alerts:
    processed_alerts.append({
        "id": a["id"],
        "original_title": a["title"],
        "clean_tokens": clean_text(a["title"] + " " + (a["description"] or "")),
        "created_at": a["created_at"],
        "assigned_group": None
    })

print(f"Loaded {len(processed_alerts)} alerts for simulation.\n")

# --- 3. Run Clustering ---
THRESHOLD = 0.14 # Lowered based on debug results

groups = []
group_counter = 0

# Sort by newest first to establish "leaders" of clusters
processed_alerts.sort(key=lambda x: x["created_at"], reverse=True)

for item in processed_alerts:
    # Try to find an existing group
    best_group_idx = -1
    best_score = -1.0
    
    # DEBUG: Print current item tokens
    # print(f"Processing: {item['original_title'][:30]}... Tokens: {item['clean_tokens']}")

    for idx, group in enumerate(groups):
        leader = group["leader"]
        
        # Calculate Semantic Score
        sem_score = compute_tf_similarity(item["clean_tokens"], leader["clean_tokens"])
        
        # Calculate Time Decay
        hours = get_hours_diff(item["created_at"], leader["created_at"])
        final_score = apply_time_decay(sem_score, hours)
        
        # DEBUG: Print comparison details
        if sem_score > 0.1: # Only print relevant matches
            print(f"   COMPARE: '{item['original_title'][:20]}...' vs '{leader['original_title'][:20]}...'")
            print(f"      - Sem Score: {sem_score:.3f} | Hours: {hours:.1f} | Final: {final_score:.3f}")

        if final_score > THRESHOLD and final_score > best_score:
            best_score = final_score
            best_group_idx = idx
            
    if best_group_idx != -1:
        # Add to group
        groups[best_group_idx]["members"].append({
            "title": item["original_title"],
            "score": best_score
        })
    else:
        # Create new group
        group_counter += 1
        groups.append({
            "id": group_counter,
            "leader": item,
            "members": [{
                "title": item["original_title"],
                "score": 1.0 # Self match
            }]
        })

# --- 4. Output Results ---
print(f"Total Clusters Formed: {len(groups)}")
print("="*60)

# Filter to show only interesting clusters (size > 1) to "wow" the user
interesting_groups = [g for g in groups if len(g["members"]) > 1]
single_groups = [g for g in groups if len(g["members"]) == 1]

print(f"Clusters with Multiples: {len(interesting_groups)}")
print(f"Unique Stories: {len(single_groups)}")
print("="*60 + "\n")

for g in interesting_groups:
    print(f"📂 CLUSTER #{g['id']} (Leader Date: {g['leader']['created_at']})")
    for m in g["members"]:
        print(f"   - [{m['score']:.2f}] {m['title'][:100]}...")
    print("-" * 40)
