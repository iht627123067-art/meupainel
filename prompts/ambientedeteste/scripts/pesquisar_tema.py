#!/usr/bin/env python3
"""
Script genérico para pesquisar, extrair e analisar notícias sobre qualquer tema.
Este script substitui a lógica hardcoded de 'palantir' e permite configurar
novas pesquisas dinamicamente.

Uso:
    python3 pesquisar_tema.py "eleicoes inteligencia artificial" --extract --analyze
    python3 pesquisar_tema.py "palantir" --analyze
"""

import os
import json
import argparse
import time
import urllib.parse
import urllib.request
from datetime import datetime
import unicodedata

# Tentar importar supabase, mas ter fallback REST se não tiver
try:
    from supabase import create_client
    SUPABASE_INSTALLED = True
except ImportError:
    SUPABASE_INSTALLED = False

# Configuração (tenta pegar do env, senão usa defaults conhecidos)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://peoyosdnthdpnhejivqo.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_KEY", ""))

if not SUPABASE_KEY:
    # Fallback to the Anon key found in previous files if ENV is not set
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3lvc2RudGhkcG5oZWppdnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTc4OTksImV4cCI6MjA4Mjc5Mzg5OX0.h0CnHfmrVc7k8MlGQKA0puv1ncKn9tBGXLgMQ1alGD8"

OUTPUT_DIR = os.path.dirname(__file__) + "/../output"
DADOS_DIR = os.path.dirname(__file__) + "/../dados"

# Garantir diretórios
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DADOS_DIR, exist_ok=True)

def normalize_text(text):
    if not text: return ""
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII').lower()

def build_query_filter(terms):
    """Constrói filtro SQL ILIKE OR para os termos"""
    # Ex: terms="eleicoes ia" -> (title.ilike.%eleicoes%,description.ilike.%eleicoes%),(title.ilike.%ia%,description.ilike.%ia%)
    # Mas queremos AND entre termos diferentes? Ou OR?
    # O usuário pediu "eleicoes e inteligencia artificial", então idealmente AND entre grupos, mas OR dentro do grupo?
    # Para simplicidade, vamos fazer uma busca ampla: se tiver QUALQUER um dos termos no titulo ou descricao.
    
    # Se o usuário passar "eleicoes, inteligencia artificial" (separado por virgula), tratamos como termos compostos
    if ',' in terms:
        parts = [t.strip() for t in terms.split(',') if len(t.strip()) > 2]
    else:
        parts = [t.strip() for t in terms.split() if len(t.strip()) > 2] # Se não tiver virgula, separa por espaço e ignora palavras curtas
    
    # PostgREST syntax for OR logic across multiple columns is tricky via raw URL param 'or'.
    # Easier to do client-side filtering if dataset isn't huge, OR use Supabase SDK .textSearch() or .or()
    return parts

def fetch_alerts(terms, limit=100):
    """Busca alertas no Supabase que correspondam aos termos"""
    print(f"🔍 Buscando alertas para termos: {terms} ...")
    
    parts = build_query_filter(terms)
    
    # Se tivermos a lib supabase, usamos ela (mais robusto)
    if SUPABASE_INSTALLED:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        query = client.from_("alerts").select("*").order("email_date", desc=True).limit(limit)
        
        # Construir filtro OR gigante: title.ilike.*term* OR description.ilike.*term*
        # PostgREST usa * como wildcard para ilike (mesmo via client library se passar raw string no .or())
        or_clauses = []
        for term in parts:
            or_clauses.append(f"title.ilike.*{term}*")
            or_clauses.append(f"description.ilike.*{term}*")
        
        or_string = ",".join(or_clauses)
        print(f"DEBUG: Parts: {parts}")
        print(f"DEBUG: OR String: {or_string}")
        
        query = query.or_(or_string)
        response = query.execute()
        data = response.data
    else:
        # Fallback REST puro
        # Construir filtro 'or' do PostgREST para filtrar no banco
        # Sintaxe: or=(col.op.val,col2.op.val)
        # Para ilike, usamos asteriscos como curinga: title.ilike.*term*
        
        postgrest_or = []
        for term in parts:
            # Remover caracteres especiais do termo para evitar quebra da URL
            clean_term = term.replace(',', '').replace('(', '').replace(')', '')
            postgrest_or.append(f"title.ilike.*{clean_term}*")
            postgrest_or.append(f"description.ilike.*{clean_term}*")
        
        params = {
            "select": "*",
            "order": "email_date.desc",
            "limit": str(limit),
            "or": f"({','.join(postgrest_or)})"
        }
        
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        
        # Requests encoda os parametros, mas o parentese do OR às vezes precisa de cuidado.
        # urllib.parse.urlencode faz o encode padrão. PostgREST aceita encoded.
        q = urllib.parse.urlencode(params)
        url = f"{SUPABASE_URL}/rest/v1/alerts?{q}"
        
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read())
        except Exception as e:
            print(f"❌ Erro na requisição REST: {e}")
            return []

    # Filtragem Client-side (Python) para refinar
    results = []
    for item in data:
        text = (normalize_text(item.get('title', '')) + " " + 
               normalize_text(item.get('description', '')) + " " +
               normalize_text(item.get('keywords') if isinstance(item.get('keywords'), str) else " ".join(item.get('keywords', []) or [])))
        
        # Lógica: Pelo menos UM dos termos deve estar presente
        matched = False
        for term in parts:
            if normalize_text(term) in text:
                matched = True
                break
        
        if matched:
            results.append(item)
            
    print(f"✅ Encontrados {len(results)} alertas correspondentes.")
    return results[:limit]

def extract_content_for_alerts(alerts):
    """Chama a Edge Function extract-content para alertas sem conteúdo"""
    print("📥 Verificando conteúdo extraído...")
    
    # Primeiro verifica quais já têm conteúdo
    alert_ids = [a['id'] for a in alerts]
    
    if SUPABASE_INSTALLED:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        resp = client.from_("extracted_content").select("alert_id").in_("alert_id", alert_ids).execute()
        existing_ids = set(item['alert_id'] for item in resp.data)
    else:
        # Fallback simplificado: assumir que precisa extrair se não tivermos certeza
        existing_ids = set() 
        # TODO: Implementar check REST se necessario, mas por enquanto vamos tentar extrair
        # O endpoint de extract deve ser idempotente ou lidar com duplicação

    to_extract = [a for a in alerts if a['id'] not in existing_ids]
    print(f"⏳ {len(to_extract)} alertas precisam de extração.")
    
    for i, alert in enumerate(to_extract):
        print(f"[{i+1}/{len(to_extract)}] Extraindo: {alert['title'][:50]}...")
        
        # Chamar Edge Function
        try:
            req_data = json.dumps({"alert_id": alert['id']}).encode('utf-8')
            req = urllib.request.Request(
                f"{SUPABASE_URL}/functions/v1/extract-content",
                data=req_data,
                headers={
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req) as resp:
                print(f"   Status: {resp.getcode()}")
        except Exception as e:
            print(f"   ❌ Erro ao invocar extract: {e}")
            # Não parar tudo por um erro
        
        # Pequeno delay para não sobrecarregar
        time.sleep(1)

def get_final_dataset(alerts):
    """Monta o dataset final combinando Alert + Content"""
    print("📊 Montando dataset final...")
    
    alert_ids = [a['id'] for a in alerts]
    
    if SUPABASE_INSTALLED:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        resp = client.from_("extracted_content").select("*").in_("alert_id", alert_ids).execute()
        contents = {c['alert_id']: c for c in resp.data}
    else:
        # Fallback REST
        # query extracted_content where alert_id in ...
        contents = {} # TODO implementar fallback se necessario

    final_data = []
    for alert in alerts:
        content_data = contents.get(alert['id'], {})
        
        item = {
            "id": alert['id'],
            "title": alert['title'],
            "date": alert['email_date'] or alert.get('created_at'),
            "publisher": alert['publisher'],
            "url": alert['url'],
            "content": content_data.get('cleaned_content'),
            "word_count": content_data.get('word_count'),
            "quality_score": content_data.get('quality_score')
        }
        
        # Só incluir se tiver conteúdo (opcional, ou incluir tudo)
        if item['content']:
            final_data.append(item)
            
    return final_data

def generate_report(data, theme):
    """Gera um relatório MD simples"""
    filename = f"RELATORIO_{theme.upper().replace(' ', '_')}.md"
    path = os.path.join(OUTPUT_DIR, filename)
    
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    md = f"# Relatório de Pesquisa: {theme.upper()}\n\n"
    md += f"**Data:** {now}\n"
    md += f"**Artigos Encontrados:** {len(data)}\n\n"
    md += "---\n\n"
    
    for item in data:
        md += f"## {item['title']}\n"
        md += f"**Fonte:** {item['publisher']} | **Data:** {item['date'][:10] if item['date'] else 'N/A'}\n\n"
        md += f"{item['content'][:500]}...\n\n"
        md += f"[Ler completo]({item['url']})\n\n"
        md += "---\n\n"
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(md)
    
    print(f"📝 Relatório gerado em: {path}")

def main():
    parser = argparse.ArgumentParser(description="Pesquisar e analisar alertas")
    parser.add_argument("terms", help="Termos de pesquisa (ex: 'eleicoes ia')")
    parser.add_argument("--extract", action="store_true", help="Forçar extração de conteúdo")
    parser.add_argument("--analyze", action="store_true", help="Gerar relatório")
    
    args = parser.parse_args()
    
    # 1. Buscar Alertas
    alerts = fetch_alerts(args.terms)
    
    if not alerts:
        print("Nenhum alerta encontrado.")
        return

    # 2. Extrair Conteúdo (se solicitado)
    if args.extract:
        extract_content_for_alerts(alerts)
    
    # 3. Baixar dados finais (com conteudo)
    final_data = get_final_dataset(alerts)
    
    # Salvar JSON
    slug = args.terms.replace(" ", "_").lower()
    json_path = os.path.join(DADOS_DIR, f"{slug}_content.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Dados salvos em: {json_path}")
    
    # 4. Gerar Relatório
    if args.analyze and final_data:
        generate_report(final_data, args.terms)

if __name__ == "__main__":
    main()
