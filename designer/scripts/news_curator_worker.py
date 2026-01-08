import os
import time
import schedule
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs, unquote

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def resolve_google_news_url(url):
    """Resolve Google News URLs robustly."""
    if "news.google.com" not in url and "google.com/url" not in url:
        return url

    print(f"Resolvendo URL: {url}")
    
    # Strategy 1: URL Param
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        if 'url' in params:
            return unquote(params['url'][0])
    except Exception:
        pass

    # Strategy 2: Network Request
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, allow_redirects=True, timeout=10)
        final_url = resp.url
        if "consent.google.com" not in final_url:
             return final_url
    except Exception as e:
        print(f"⚠️ Erro ao resolver URL: {e}")
    
    return url

def extract_content(url):
    """Extracts title and content from URL using BeautifulSoup."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.content, 'html.parser')
        
        # Remove junk
        for tag in soup(['script', 'style', 'nav', 'footer', 'iframe', 'noscript']):
            tag.decompose()
            
        # Get content
        article = soup.find('article') or soup.find('main') or soup.body
        
        text_content = ""
        markdown_content = ""
        
        if article:
            # Build simple markdown
            for elem in article.find_all(['h1', 'h2', 'p', 'ul', 'ol']):
                if elem.name == 'h1':
                    markdown_content += f"# {elem.get_text().strip()}\n\n"
                elif elem.name == 'h2':
                    markdown_content += f"## {elem.get_text().strip()}\n\n"
                elif elem.name == 'p':
                    markdown_content += f"{elem.get_text().strip()}\n\n"
                elif elem.name in ['ul', 'ol']:
                    for li in elem.find_all('li'):
                        markdown_content += f"- {li.get_text().strip()}\n"
                    markdown_content += "\n"
                    
            text_content = article.get_text(separator=' ', strip=True)
            
        word_count = len(text_content.split())
        return {
            "markdown": markdown_content,
            "word_count": word_count,
            "success": True
        }
        
    except Exception as e:
        print(f"❌ Erro na extração: {e}")
        return {"success": False, "error": str(e)}

def process_pending_alerts():
    """Fetches 'pending' alerts and extracts content."""
    print("🔍 Buscando alertas pendentes...")
    
    response = supabase.table('alerts').select("*").eq('status', 'pending').limit(5).execute()
    alerts = response.data
    
    if not alerts:
        print("✅ Nenhum alerta pendente.")
        return

    for alert in alerts:
        print(f"👉 Processando: {alert.get('title', 'Sem título')}")
        
        original_url = alert.get('url')
        clean_url = resolve_google_news_url(original_url)
        
        # Extract
        extraction = extract_content(clean_url)
        
        if extraction['success']:
            # Save extracted content
            supabase.table('extracted_content').upsert({
                'alert_id': alert['id'],
                'markdown_content': extraction['markdown'],
                'cleaned_content': extraction['markdown'], # Simple dup for now
                'word_count': extraction['word_count'],
                'extraction_status': 'completed',
                'extracted_at': 'now()'
            }, on_conflict='alert_id').execute()
            
            # Update alert
            supabase.table('alerts').update({
                'status': 'extracted',
                'clean_url': clean_url
            }).eq('id', alert['id']).execute()
            
            print("✅ Conteúdo extraído com sucesso.")
        else:
            print("❌ Falha na extração.")
            # Optional: Mark as error or retry later
            # supabase.table('alerts').update({'status': 'error'}).eq('id', alert['id']).execute()

def run_scheduler():
    schedule.every(5).minutes.do(process_pending_alerts)
    
    print("🚀 Worker iniciado. Rodando a cada 5 minutos.")
    process_pending_alerts() # Run once immediately
    
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    run_scheduler()
