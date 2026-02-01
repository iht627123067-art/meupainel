#!/usr/bin/env python3
"""
Script para extrair alertas Palantir do Supabase e chamar a edge function
extract-content para processar o conteúdo.

Uso:
    python extrair_palantir.py --limit 10 --dry-run   # Teste sem executar
    python extrair_palantir.py --limit 50             # Extrai 50 artigos
"""

import os
import json
import argparse
import time
from datetime import datetime
from supabase import create_client

# Configuração Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://peoyosdnthdpnhejivqo.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Configuração do tema
TEMA = "palantir"
OUTPUT_DIR = os.path.dirname(__file__) + "/../dados"

def conectar_supabase():
    """Conecta ao Supabase"""
    if not SUPABASE_KEY:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY não configurada!")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def buscar_alertas_palantir(supabase, limit=50):
    """Busca alertas sobre Palantir sem conteúdo extraído"""
    
    # Buscar alertas que mencionam Palantir
    response = supabase.from_("alerts")\
        .select("id, title, clean_url, url, status, email_date")\
        .or_(f"title.ilike.%{TEMA}%,description.ilike.%{TEMA}%")\
        .order("email_date", desc=True)\
        .limit(limit)\
        .execute()
    
    alertas = response.data
    
    # Verificar quais já têm conteúdo extraído
    if alertas:
        ids = [a["id"] for a in alertas]
        extraidos = supabase.from_("extracted_content")\
            .select("alert_id")\
            .in_("alert_id", ids)\
            .execute()
        
        ids_extraidos = {e["alert_id"] for e in extraidos.data}
        
        # Filtrar apenas os não extraídos
        alertas = [a for a in alertas if a["id"] not in ids_extraidos]
    
    return alertas

def chamar_extract_content(supabase, alert_id, dry_run=False):
    """Chama a edge function extract-content"""
    if dry_run:
        print(f"  [DRY-RUN] Simulando extração para {alert_id}")
        return {"success": True, "dry_run": True}
    
    try:
        response = supabase.functions.invoke(
            "extract-content",
            invoke_options={"body": {"alert_id": alert_id, "translate": False}}
        )
        return response
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Extrair alertas Palantir")
    parser.add_argument("--limit", type=int, default=10, help="Limite de alertas a processar")
    parser.add_argument("--dry-run", action="store_true", help="Modo teste, não executa extração")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay entre requisições (segundos)")
    args = parser.parse_args()
    
    print(f"=" * 60)
    print(f"📊 EXTRAÇÃO DE ALERTAS PALANTIR")
    print(f"=" * 60)
    print(f"Tema: {TEMA}")
    print(f"Limite: {args.limit}")
    print(f"Dry-run: {args.dry_run}")
    print(f"Delay: {args.delay}s")
    print()
    
    # Conectar
    supabase = conectar_supabase()
    print("✅ Conectado ao Supabase")
    
    # Buscar alertas
    alertas = buscar_alertas_palantir(supabase, limit=args.limit)
    print(f"📋 Encontrados {len(alertas)} alertas para processar")
    
    if not alertas:
        print("Nenhum alerta novo para processar!")
        return
    
    # Salvar lista de alertas
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(f"{OUTPUT_DIR}/{TEMA}_alertas.json", "w") as f:
        json.dump(alertas, f, indent=2, default=str)
    print(f"💾 Lista salva em: {OUTPUT_DIR}/{TEMA}_alertas.json")
    
    # Processar cada alerta
    resultados = []
    for i, alerta in enumerate(alertas, 1):
        print(f"\n[{i}/{len(alertas)}] {alerta['title'][:60]}...")
        
        resultado = chamar_extract_content(supabase, alerta["id"], dry_run=args.dry_run)
        resultados.append({
            "alert_id": alerta["id"],
            "title": alerta["title"],
            "resultado": resultado
        })
        
        if resultado.get("success"):
            print(f"  ✅ Sucesso")
        else:
            print(f"  ❌ Erro: {resultado.get('error', 'desconhecido')}")
        
        if i < len(alertas) and not args.dry_run:
            time.sleep(args.delay)
    
    # Salvar resultados
    with open(f"{OUTPUT_DIR}/{TEMA}_extracoes_{datetime.now().strftime('%Y%m%d_%H%M')}.json", "w") as f:
        json.dump(resultados, f, indent=2, default=str)
    
    # Resumo
    sucessos = sum(1 for r in resultados if r["resultado"].get("success"))
    print(f"\n{'=' * 60}")
    print(f"📊 RESUMO")
    print(f"{'=' * 60}")
    print(f"Total processado: {len(resultados)}")
    print(f"Sucessos: {sucessos}")
    print(f"Erros: {len(resultados) - sucessos}")

if __name__ == "__main__":
    main()
