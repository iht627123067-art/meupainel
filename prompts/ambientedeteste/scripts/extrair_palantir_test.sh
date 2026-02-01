#!/bin/bash
# Script para testar extração de alertas Palantir via Edge Function
# Usa as variáveis do .env do projeto

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="/Users/thiagobvilar/Documents/meupainel/designer/.env"

# Carregar variáveis do .env
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    echo "✅ Variáveis carregadas de: $ENV_FILE"
else
    echo "❌ Arquivo .env não encontrado: $ENV_FILE"
    exit 1
fi

SUPABASE_URL="${VITE_SUPABASE_URL}"
ANON_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"

echo ""
echo "🎯 EXTRAÇÃO DE CONTEÚDO - PALANTIR"
echo "=================================="
echo "URL: $SUPABASE_URL"
echo ""

# IDs dos alertas Palantir para teste (segunda tentativa)
ALERT_IDS=(
    "3785b806-6084-4340-82ae-a7d52386fe9d"  # Fortune
    "a77f357c-416f-44a0-991d-3605acfd32ea"  # IG Group
)

# Limite de alertas a processar (argumento opcional)
LIMIT="${1:-3}"

SUCCESS=0
FAILED=0

for i in "${!ALERT_IDS[@]}"; do
    if [ $i -ge $LIMIT ]; then
        break
    fi
    
    ALERT_ID="${ALERT_IDS[$i]}"
    echo "[$((i+1))/$LIMIT] Processando: $ALERT_ID"
    
    # Chamar edge function
    RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/extract-content" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ANON_KEY}" \
        -d "{\"alert_id\": \"$ALERT_ID\", \"translate\": false}" 2>&1)
    
    # Verificar sucesso
    if echo "$RESPONSE" | grep -q '"success":true'; then
        WORD_COUNT=$(echo "$RESPONSE" | grep -o '"word_count":[0-9]*' | cut -d: -f2)
        QUALITY=$(echo "$RESPONSE" | grep -o '"quality_score":[0-9.]*' | cut -d: -f2)
        echo "   ✅ Sucesso! Palavras: $WORD_COUNT | Qualidade: $QUALITY"
        ((SUCCESS++))
    else
        ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | head -1)
        echo "   ❌ Erro: $ERROR"
        ((FAILED++))
    fi
    
    # Delay para não sobrecarregar
    if [ $i -lt $((LIMIT-1)) ]; then
        sleep 2
    fi
done

echo ""
echo "=================================="
echo "📊 RESUMO"
echo "   Sucesso: $SUCCESS"
echo "   Falhas:  $FAILED"
echo "=================================="
