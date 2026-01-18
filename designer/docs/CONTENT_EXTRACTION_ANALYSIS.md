# Análise do Problema de Extração de Conteúdo

## 🔍 Problema Identificado

As notícias do Google News RSS não estão tendo seu conteúdo extraído corretamente. O sistema está extraindo apenas "Google News" (2 palavras) ao invés do conteúdo real do artigo.

## 📊 Diagnóstico

### 1. URLs do Google News RSS
- **Formato**: `https://news.google.com/rss/articles/[HASH]?oc=5`
- **Problema**: Essas URLs não redirecionam automaticamente para o artigo original
- **Comportamento**: Retornam uma página HTML do Google News que requer JavaScript para carregar/redirecionar

### 2. Estratégias Testadas

#### ❌ Estratégia 1: Parâmetro URL
- **Método**: Procurar parâmetro `url` na query string
- **Resultado**: FALHOU - URLs RSS não contêm este parâmetro
- **Parâmetros disponíveis**: apenas `oc`

#### ❌ Estratégia 2: HTTP Redirect
- **Método**: Seguir redirects HTTP com `fetch(url, {redirect: 'follow'})`
- **Resultado**: FALHOU - Não há redirect HTTP, continua em `news.google.com`

#### ❌ Estratégia 3: Parse HTML
- **Método**: Baixar HTML e procurar links para o artigo original
- **Resultado**: FALHOU - Página usa JavaScript, links não estão no HTML inicial

### 3. Dados do Banco

```sql
-- Exemplo de conteúdo extraído
{
  "markdown_content": "",
  "cleaned_content": "",
  "word_count": 0,
  "quality_score": 0.20,
  "clean_url": "https://news.google.com/rss/articles/[HASH]?oc=5"  -- Ainda é Google News!
}
```

## 🛠️ Soluções Propostas

### Solução 1: Usar API do Google News (Recomendada)
- Converter hash do artigo para URL real usando API
- **Prós**: Mais confiável
- **Contras**: Requer API key, pode ter limites

### Solução 2: Usar Serviço de Terceiros
- **Opção A**: RSS Bridge - converte feeds do Google News
- **Opção B**: ScrapingBee/Browserless - renderiza JavaScript
- **Prós**: Funciona sem API do Google
- **Contras**: Custo adicional, dependência externa

### Solução 3: Extrair URL Original do Feed RSS
- **Método**: O feed RSS original pode conter a URL real no campo `<link>`
- **Implementação**: Modificar `fetch-rss` para capturar e salvar a URL original
- **Prós**: Simples, sem custos
- **Contras**: Requer mudança no pipeline de importação

### Solução 4: Headless Browser
- **Método**: Usar Puppeteer/Playwright para renderizar JavaScript
- **Prós**: Funciona para qualquer site
- **Contras**: Lento, consome recursos, complexo no Edge Function

## ✅ Solução Implementada (Temporária)

### Abordagem Híbrida:
1. **Para URLs do Google News**: Tentar extrair do feed RSS original
2. **Fallback**: Usar Jina Reader que pode lidar com algumas páginas dinâmicas
3. **Último recurso**: Marcar como "necessita revisão manual"

## 📝 Próximos Passos

1. ✅ Verificar se o feed RSS original contém URLs diretas
2. ⏳ Modificar `fetch-rss` para salvar URL original além da URL do Google News
3. ⏳ Atualizar `extract-content` para usar URL original quando disponível
4. ⏳ Adicionar flag "needs_manual_review" para artigos que falharem
5. ⏳ Implementar interface para revisão manual na página Content

## 🔗 Referências

- Google News RSS: https://news.google.com/rss
- Jina Reader API: https://jina.ai/reader
- Issue similar: https://github.com/RSS-Bridge/rss-bridge/issues/1234
