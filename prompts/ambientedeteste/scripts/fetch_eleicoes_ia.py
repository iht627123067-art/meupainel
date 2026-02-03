import os
import json
import urllib.request
import urllib.parse
from urllib.error import HTTPError
import unicodedata

# Configuration (from fetch_data.py)
# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://peoyosdnthdpnhejivqo.supabase.co")
# Try environment key first (Service Role), then fallback to hardcoded (Anon)
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3lvc2RudGhkcG5oZWppdnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTc4OTksImV4cCI6MjA4Mjc5Mzg5OX0.h0CnHfmrVc7k8MlGQKA0puv1ncKn9tBGXLgMQ1alGD8")

OUTPUT_FILE = os.path.dirname(__file__) + "/../dados/eleicoes_ia_content.json"

def fetch_data(table, query_params):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query_params}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except HTTPError as e:
        print(f"Error fetching {table}: {e}")
        try:
            print(e.read().decode())
        except:
            pass
        return []

def normalize_text(text):
    if not text:
        return ""
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII').lower()

def main():
    # DEBUG: Fetch latest 5 alerts to check if DB has data
    params = urllib.parse.urlencode({
        "select": "id,title,description",
        "order": "email_date.desc",
        "limit": "5"
    })
    
    print("DEBUG: Fetching latest 5 alerts...")
    debug_alerts = fetch_data("alerts", params)
    print(f"DEBUG: Found {len(debug_alerts)} alerts.")
    for a in debug_alerts:
        print(f"- {a.get('title')}")

    print("\nFetching alerts for 'Eleicoes' and 'IA'...")
    
    # We want articles that mention (Elections) AND (AI).
    # Since PostgREST ILIKE with OR is easier, we will fetch a broader set and filter in Python.
    # We fetch articles matching "elei" OR "inteligencia" OR "IA" OR "artificial"
    # Note: "IA" is very short, might match many things. "AI" too.
    # We will fetch based on "elei" (covers eleicao, eleicoes, eleição) first, as it is more specific than "IA".
    # Searching for *elei* in title or description.
    
    params = urllib.parse.urlencode({
        "select": "id,title,email_date,publisher,description,url,clean_url",
        "or": "(title.ilike.*elei*,description.ilike.*elei*)",
        "limit": "100" # Adding a limit to see if it works with logic, fetch_data didn't have one
    })
    
    alerts = fetch_data("alerts", params)
    
    if not alerts:
        print("No alerts found for 'elei*'.")
        return

    print(f"Found {len(alerts)} alerts matching 'elei*'. Filtering for AI relevance...")
    
    # Filter for AI keywords
    ai_keywords = ["inteligencia artificial", "inteligência artificial", " ia ", " ai ", "artificial intelligence", "generative ai", "llm", "chatgpt"]
    # We use padding spaces for short acronyms to avoid partial matches like "maIA", "prAIse"
    # But titles might start/end with IA. So regex is better, or simple check.
    
    filtered_alerts = []
    for a in alerts:
        title = normalize_text(a.get("title", ""))
        desc = normalize_text(a.get("description", ""))
        combined = title + " " + desc
        
        # Check for eleicoes (already filtered by DB, but good to be sure)
        # Check for AI
        has_ai = False
        for kw in ai_keywords:
            if kw in combined:
                has_ai = True
                break
        
        # Boundary checks for IA/AI if not strict substring
        if not has_ai:
            words = combined.split()
            if "ia" in words or "ai" in words:
                has_ai = True
        
        if has_ai:
            filtered_alerts.append(a)
    
    print(f"Filtered down to {len(filtered_alerts)} alerts relevant to 'Eleicoes' AND 'IA'.")
    
    if not filtered_alerts:
        return

    ids = [a["id"] for a in filtered_alerts]
    
    print("Fetching extracted content...")
    all_content = []
    
    # Chunking
    chunk_size = 30 
    for i in range(0, len(ids), chunk_size):
        chunk_ids = ids[i:i + chunk_size]
        id_str = ",".join(chunk_ids)
        params = urllib.parse.urlencode({
            "select": "alert_id,cleaned_content,word_count,quality_score",
            "alert_id": f"in.({id_str})"
        })
        content = fetch_data("extracted_content", params)
        all_content.extend(content)

    print(f"Found {len(all_content)} extracted content items.")

    # Match and Merge
    alertas_dict = {a["id"]: a for a in filtered_alerts}
    resultado = []

    for c in all_content:
        alert_id = c["alert_id"]
        if alert_id in alertas_dict:
            alerta = alertas_dict[alert_id]
            merged = {
                "id": alert_id,
                "title": alerta.get("title"),
                "date": alerta.get("email_date"),
                "publisher": alerta.get("publisher"),
                "url": alerta.get("clean_url") or alerta.get("url"),
                "content": c.get("cleaned_content"),
                "word_count": c.get("word_count"),
                "quality_score": c.get("quality_score")
            }
            resultado.append(merged)
    
    # Sort by date
    resultado.sort(key=lambda x: x["date"] or "", reverse=True)

    # Save
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resultado, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved {len(resultado)} items to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
