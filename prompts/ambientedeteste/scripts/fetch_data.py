import os
import json
import urllib.request
import urllib.parse
from urllib.error import HTTPError

# Configuration (from .env)
SUPABASE_URL = "https://peoyosdnthdpnhejivqo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3lvc2RudGhkcG5oZWppdnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTc4OTksImV4cCI6MjA4Mjc5Mzg5OX0.h0CnHfmrVc7k8MlGQKA0puv1ncKn9tBGXLgMQ1alGD8"

OUTPUT_FILE = os.path.dirname(__file__) + "/../dados/palantir_content.json"

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
        print(e.read().decode())
        return []

def main():
    print("Fetching alerts...")
    # SQL: SELECT ... FROM alerts WHERE title ILIKE '%palantir%' OR description ILIKE '%palantir%'
    # PostgREST: or=(title.ilike.*palantir*,description.ilike.*palantir*)
    params = urllib.parse.urlencode({
        "select": "id,title,email_date,publisher,description,url,clean_url",
        "or": "(title.ilike.*palantir*,description.ilike.*palantir*)"
    })
    
    alerts = fetch_data("alerts", params)
    
    if not alerts:
        print("No alerts found.")
        return

    print(f"Found {len(alerts)} alerts.")
    ids = [a["id"] for a in alerts]
    
    print("Fetching extracted content...")
    all_content = []
    
    # Chunking
    chunk_size = 30 # URL length limits
    for i in range(0, len(ids), chunk_size):
        chunk_ids = ids[i:i + chunk_size]
        # PostgREST: alert_id=in.(id1,id2,...)
        id_str = ",".join(chunk_ids)
        params = urllib.parse.urlencode({
            "select": "alert_id,cleaned_content,word_count,quality_score",
            "alert_id": f"in.({id_str})"
        })
        content = fetch_data("extracted_content", params)
        all_content.extend(content)

    print(f"Found {len(all_content)} extracted content items.")

    # Match and Merge
    alertas_dict = {a["id"]: a for a in alerts}
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
