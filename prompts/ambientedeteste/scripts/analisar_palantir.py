#!/usr/bin/env python3
"""
Script para analisar conteúdo extraído sobre Palantir e gerar relatório.

Funcionalidades:
- Word Cloud
- Análise de Sentimento (via LLM)
- Estatísticas gerais
- Linha do tempo
- Nuvem de palavras

Uso:
    python analisar_palantir.py --output ../output/palantir_relatorio.md
"""

import os
import json
import argparse
from collections import Counter
from datetime import datetime
import re

# Opcional: bibliotecas avançadas
try:
    from wordcloud import WordCloud
    WORDCLOUD_AVAILABLE = True
except ImportError:
    WORDCLOUD_AVAILABLE = False
    print("⚠️ wordcloud não instalado. Instale com: pip install wordcloud")

try:
    from supabase import create_client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("⚠️ supabase não instalado. Instale com: pip install supabase")

# Configuração
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://peoyosdnthdpnhejivqo.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
TEMA = "palantir"
OUTPUT_DIR = os.path.dirname(__file__) + "/../output"
DADOS_DIR = os.path.dirname(__file__) + "/../dados"

# Stop words multi-idioma
STOP_WORDS = {
    "the", "and", "or", "is", "in", "to", "of", "for", "on", "with", "at", "by",
    "a", "an", "it", "its", "as", "be", "has", "have", "had", "are", "was", "were",
    "o", "a", "e", "de", "da", "do", "em", "um", "uma", "para", "com", "não", "que",
    "el", "la", "los", "las", "un", "una", "del", "en", "con", "por", "que", "se",
    "this", "that", "these", "those", "will", "can", "could", "would", "should",
    "palantir", "stock", "stocks", "company", "companies", "says", "said", "new",
    "more", "than", "year", "years", "just", "now", "also", "like", "get", "make",
}

def conectar_supabase():
    """Conecta ao Supabase"""
    if not SUPABASE_AVAILABLE or not SUPABASE_KEY:
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def buscar_conteudo_extraido(supabase):
    """Busca conteúdo extraído sobre Palantir"""
    if not supabase:
        # Fallback: ler de arquivo local
        arquivo = f"{DADOS_DIR}/{TEMA}_content.json"
        if os.path.exists(arquivo):
            with open(arquivo) as f:
                data = json.load(f)
                # Normalize keys if needed
                for item in data:
                    if "email_date" not in item and "date" in item:
                        item["email_date"] = item["date"]
                return data
        return []
    
    # Buscar alertas Palantir
    alertas_resp = supabase.from_("alerts")\
        .select("id, title, email_date, publisher")\
        .or_(f"title.ilike.%{TEMA}%,description.ilike.%{TEMA}%")\
        .execute()
    
    if not alertas_resp.data:
        return []
    
    ids = [a["id"] for a in alertas_resp.data]
    
    # Buscar conteúdo extraído
    conteudo_resp = supabase.from_("extracted_content")\
        .select("alert_id, cleaned_content, word_count, quality_score")\
        .in_("alert_id", ids)\
        .execute()
    
    # Mesclar dados
    alertas_dict = {a["id"]: a for a in alertas_resp.data}
    resultado = []
    
    for c in conteudo_resp.data:
        alerta = alertas_dict.get(c["alert_id"], {})
        resultado.append({
            "alert_id": c["alert_id"],
            "title": alerta.get("title", ""),
            "email_date": alerta.get("email_date", ""),
            "publisher": alerta.get("publisher", ""),
            "content": c.get("cleaned_content", ""),
            "word_count": c.get("word_count", 0),
            "quality_score": c.get("quality_score", 0)
        })
    
    return resultado

def extrair_palavras(texto):
    """Extrai palavras limpas do texto"""
    if not texto:
        return []
    
    texto = texto.lower()
    texto = re.sub(r'[^a-záéíóúâêîôûãõàèìòùç\s]', ' ', texto)
    palavras = texto.split()
    
    return [p for p in palavras if p not in STOP_WORDS and len(p) > 3]

def analisar_frequencia(conteudos):
    """Analisa frequência de palavras"""
    todas_palavras = []
    
    for item in conteudos:
        palavras = extrair_palavras(item.get("content", ""))
        todas_palavras.extend(palavras)
    
    return Counter(todas_palavras)

def gerar_timeline(conteudos):
    """Gera dados para linha do tempo"""
    por_data = {}
    
    for item in conteudos:
        data = item.get("email_date", "")
        if data:
            data_str = data[:10]  # YYYY-MM-DD
            por_data[data_str] = por_data.get(data_str, 0) + 1
    
    return dict(sorted(por_data.items()))

def gerar_publishers(conteudos):
    """Conta publicadores"""
    publishers = Counter()
    
    for item in conteudos:
        pub = item.get("publisher", "Desconhecido")
        if pub:
            publishers[pub] += 1
    
    return publishers

def gerar_wordcloud_image(frequencias, output_path):
    """Gera imagem de nuvem de palavras"""
    if not WORDCLOUD_AVAILABLE:
        return False
    
    wc = WordCloud(
        width=800,
        height=400,
        background_color="white",
        colormap="viridis",
        max_words=100
    ).generate_from_frequencies(frequencias)
    
    wc.to_file(output_path)
    return True

def gerar_relatorio_md(dados_analise, output_path):
    """Gera relatório em Markdown"""
    
    relatorio = f"""# Relatório de Monitoramento: Palantir Technologies

> **Gerado em**: {datetime.now().strftime("%d/%m/%Y às %H:%M")}  
> **Tema**: {TEMA.capitalize()}

---

## 📊 Sumário Executivo

| Métrica | Valor |
|---------|-------|
| Total de artigos analisados | {dados_analise['total_artigos']} |
| Total de palavras | {dados_analise['total_palavras']:,} |
| Período | {dados_analise['periodo']} |
| Publishers únicos | {dados_analise['total_publishers']} |

---

## 🔤 Palavras Mais Frequentes

| Palavra | Frequência |
|---------|------------|
"""
    
    for palavra, freq in dados_analise['top_palavras'][:20]:
        relatorio += f"| {palavra} | {freq} |\n"
    
    relatorio += f"""
---

## 📰 Publicadores

| Publisher | Artigos |
|-----------|---------|
"""
    
    for pub, count in dados_analise['publishers'][:15]:
        relatorio += f"| {pub} | {count} |\n"
    
    relatorio += f"""
---

## 📈 Linha do Tempo

| Data | Artigos |
|------|---------|
"""
    
    for data, count in list(dados_analise['timeline'].items())[-15:]:
        relatorio += f"| {data} | {'█' * min(count, 20)} {count} |\n"
    
    relatorio += f"""
---

## 📌 Artigos Recentes

"""
    
    for i, art in enumerate(dados_analise['artigos_recentes'][:10], 1):
        relatorio += f"{i}. **{art['title'][:80]}**\n"
        relatorio += f"   - Publisher: {art.get('publisher', 'N/A')}\n"
        relatorio += f"   - Data: {art.get('email_date', 'N/A')[:10] if art.get('email_date') else 'N/A'}\n\n"
    
    relatorio += """
---

## 📝 Notas Metodológicas

- Dados extraídos via Google Alerts e RSS feeds
- Conteúdo processado via Jina AI Reader
- Stop words removidas em PT/EN/ES
- Análise executada localmente (ambiente de teste)

---

*Relatório gerado automaticamente pelo sistema de análise de alertas.*
"""
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(relatorio)
    
    return output_path

def main():
    parser = argparse.ArgumentParser(description="Analisar alertas Palantir")
    parser.add_argument("--output", default=f"{OUTPUT_DIR}/palantir_relatorio.md", help="Arquivo de saída")
    parser.add_argument("--wordcloud", action="store_true", help="Gerar imagem de word cloud")
    args = parser.parse_args()
    
    print(f"=" * 60)
    print(f"📊 ANÁLISE DE ALERTAS PALANTIR")
    print(f"=" * 60)
    
    # Conectar
    supabase = conectar_supabase()
    if supabase:
        print("✅ Conectado ao Supabase")
    else:
        print("⚠️ Modo offline (lendo de arquivos locais)")
    
    # Buscar conteúdo
    conteudos = buscar_conteudo_extraido(supabase)
    print(f"📋 Encontrados {len(conteudos)} artigos com conteúdo extraído")
    
    if not conteudos:
        print("❌ Nenhum conteúdo para analisar!")
        print("   Execute primeiro: python extrair_palantir.py")
        return
    
    # Análises
    print("\n🔍 Executando análises...")
    frequencias = analisar_frequencia(conteudos)
    timeline = gerar_timeline(conteudos)
    publishers = gerar_publishers(conteudos)
    
    # Calcular período
    datas = [c.get("email_date", "")[:10] for c in conteudos if c.get("email_date")]
    periodo = f"{min(datas) if datas else 'N/A'} a {max(datas) if datas else 'N/A'}"
    
    # Montar dados
    dados_analise = {
        "total_artigos": len(conteudos),
        "total_palavras": sum(frequencias.values()),
        "periodo": periodo,
        "total_publishers": len(publishers),
        "top_palavras": frequencias.most_common(50),
        "publishers": publishers.most_common(20),
        "timeline": timeline,
        "artigos_recentes": sorted(conteudos, key=lambda x: x.get("email_date") or "", reverse=True)
    }
    
    # Gerar word cloud
    if args.wordcloud and WORDCLOUD_AVAILABLE:
        wc_path = args.output.replace(".md", "_wordcloud.png")
        if gerar_wordcloud_image(dict(frequencias.most_common(100)), wc_path):
            print(f"☁️ Word cloud salva: {wc_path}")
    
    # Gerar relatório
    output_path = gerar_relatorio_md(dados_analise, args.output)
    print(f"\n✅ Relatório gerado: {output_path}")
    
    # Salvar dados de análise
    dados_path = f"{DADOS_DIR}/{TEMA}_analise.json"
    with open(dados_path, "w") as f:
        json.dump({
            "data_analise": datetime.now().isoformat(),
            "total_artigos": dados_analise["total_artigos"],
            "total_palavras": dados_analise["total_palavras"],
            "top_palavras": dados_analise["top_palavras"][:30],
            "publishers": dados_analise["publishers"][:10],
            "timeline": dados_analise["timeline"]
        }, f, indent=2)
    print(f"💾 Dados salvos: {dados_path}")

if __name__ == "__main__":
    main()
