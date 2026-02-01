#!/bin/bash
# Script para testar a extração de conteúdo de alertas Palantir
# Uso: ./testar_extracao.sh <alert_id>

set -e

# Configuração - carrega do .env se existir
if [ -f "../../designer/.env" ]; then
    export $(grep -v '^#' ../../designer/.env | xargs)
fi

SUPABASE_URL="${SUPABASE_URL:-https://peoyosdnthdpnhejivqo.supabase.co}"
EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/extract-content"

# Verificar se tem o anon key
if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️ SUPABASE_ANON_KEY não encontrada!"
    echo "Configure manualmente ou adicione ao .env"
    exit 1
fi

# ID do alerta (pode ser passado como argumento ou usar um de teste)
ALERT_ID="${1:-}"

if [ -z "$ALERT_ID" ]; then
    echo "🔍 Buscando alertas Palantir..."
    echo "   (Copie um ID da lista abaixo para testar)"
    echo ""
    echo "Alertas recentes sobre Palantir:"
    echo "================================"
    
    # Usar curl para buscar via REST API
    curl -s "${SUPABASE_URL}/rest/v1/alerts?select=id,title&or=(title.ilike.%25palantir%25,description.ilike.%25palantir%25)&limit=10&order=email_date.desc" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data:
    print(f\"ID: {item['id']}\")
    print(f\"   {item['title'][:70]}...\")
    print()
"
    echo ""
    echo "Uso: $0 <alert_id>"
    exit 0
fi

echo "🚀 Extraindo conteúdo para alerta: $ALERT_ID"
echo ""

# Chamar edge function
response=$(curl -s -X POST "$EDGE_FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -d "{\"alert_id\": \"$ALERT_ID\", \"translate\": false}")

# Mostrar resultado formatado
echo "$response" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ Extração bem-sucedida!')
        print(f\"   Palavras: {data.get('word_count', 'N/A')}\")
        print(f\"   Qualidade: {data.get('quality_score', 'N/A')}\")
        print(f\"   Fonte: {data.get('extraction_source', 'N/A')}\")
    else:
        print('❌ Erro na extração:')
        print(f\"   {data.get('error', 'desconhecido')}\")
except:
    print('❌ Resposta inválida da API')
    print(sys.stdin.read())
"
