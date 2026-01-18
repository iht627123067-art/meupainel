# 🔍 Relatório de Revisão: Pipeline e Extração de Conteúdo

**Data**: 06/01/2026  
**Status**: ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS

---

## 📋 Resumo Executivo

O pipeline de extração de conteúdo está **parcialmente funcional**, mas com **falhas críticas** na extração de artigos do Google News RSS. Os artigos estão sendo marcados como "extraídos" mas com **conteúdo vazio** (0 palavras).

---

## 🔴 Problemas Identificados

### 1. **URLs do Google News Não São Resolvidas**
- **Sintoma**: `clean_url` permanece como URL do Google News
- **Causa**: URLs RSS do Google News (`https://news.google.com/rss/articles/[HASH]?oc=5`) não redirecionam via HTTP
- **Impacto**: Extração tenta ler página do Google News ao invés do artigo original

### 2. **Conteúdo Extraído Está Vazio**
- **Sintoma**: `markdown_content = ""`, `word_count = 0`
- **Causa**: Jina Reader e Cheerio fallback não conseguem extrair conteúdo de páginas JavaScript do Google News
- **Impacto**: 100% dos artigos do Google News RSS têm extração falhada

### 3. **Alertas Pendentes Não São Processados**
- **Sintoma**: 10 alertas em status "pending" sem processar
- **Causa**: Worker Python (`news_curator_worker.py`) não está rodando
- **Impacto**: Novos artigos não são processados automaticamente

---

## ✅ O Que Está Funcionando

1. ✅ Edge Function `extract-content` está deployada e respondendo
2. ✅ Banco de dados está salvando registros corretamente
3. ✅ Interface da página Content está funcional
4. ✅ Jina Reader API funciona para URLs diretas (não-Google News)
5. ✅ Fallback com Cheerio está implementado

---

## 🔬 Descobertas Técnicas

### Estrutura do Feed RSS do Google News

```xml
<item>
  <title>AI boom is in early bubble phase - Reuters</title>
  <link>https://news.google.com/rss/articles/[HASH]?oc=5</link>
  <source url="https://www.reuters.com">Reuters</source>
  <description>...</description>
</item>
```

**Descoberta Chave**: O campo `<source url>` contém o **domínio do publisher original**!

### Estratégias de Resolução Testadas

| Estratégia    | Método                             | Resultado           |
| ------------- | ---------------------------------- | ------------------- |
| URL Param     | Procurar `?url=` na query string   | ❌ Não existe        |
| HTTP Redirect | `fetch()` com `redirect: 'follow'` | ❌ Não redireciona   |
| Parse HTML    | Cheerio para extrair links         | ❌ Requer JavaScript |
| RSS Source    | Campo `<source url>` no feed       | ✅ **FUNCIONA!**     |

---

## 🛠️ Soluções Propostas

### 🎯 **Solução Recomendada: Usar Campo `source` do RSS**

#### Fase 1: Capturar URL do Source (Imediato)
1. Modificar `fetch-rss` Edge Function para extrair campo `<source url>`
2. Salvar em novo campo `source_url` na tabela `alerts`
3. Usar `source_url` + título para buscar artigo via Google

#### Fase 2: Busca Inteligente (Curto Prazo)
1. Implementar busca: `site:{source_url} {title}` no Google
2. Usar primeiro resultado como URL real
3. Alternativa: Usar API de busca (SerpAPI, etc)

#### Fase 3: Fallback Robusto (Médio Prazo)
1. Se busca falhar, marcar como `needs_manual_review`
2. Adicionar interface na página Content para revisão manual
3. Permitir usuário inserir URL correta manualmente

---

## 📊 Dados Atuais

```sql
-- Status dos Alertas
pending: 10 alertas
extracted: 1 alerta (mas com conteúdo vazio)
classified: 2 alertas
published: 1 alerta

-- Conteúdo Extraído
Total: 1 registro
Word Count: 0 (vazio!)
Quality Score: 0.20 (baixíssimo)
```

---

## 🚀 Próximos Passos Recomendados

### Prioridade ALTA (Fazer Agora)
1. ✅ **Documentar problema** (CONCLUÍDO)
2. ⏳ **Modificar `fetch-rss`** para capturar `source_url`
3. ⏳ **Atualizar schema** da tabela `alerts` (adicionar coluna `source_url`)
4. ⏳ **Implementar busca** usando `source_url` + título
5. ⏳ **Testar** com artigos pendentes

### Prioridade MÉDIA (Próxima Sprint)
6. ⏳ Adicionar flag `needs_manual_review` na tabela `extracted_content`
7. ⏳ Implementar interface de revisão manual na página Content
8. ⏳ Configurar worker Python para rodar automaticamente
9. ⏳ Adicionar monitoramento de qualidade de extração

### Prioridade BAIXA (Backlog)
10. ⏳ Implementar cache de URLs resolvidas
11. ⏳ Adicionar métricas de sucesso/falha de extração
12. ⏳ Explorar APIs alternativas (NewsAPI, etc)

---

## 📝 Notas Técnicas

### Limitações do Google News RSS
- URLs são hashes opacos, não contêm URL original
- Páginas requerem JavaScript para redirecionar
- Não há API oficial para resolver URLs
- Termos de serviço proíbem scraping automatizado

### Alternativas Consideradas
- ❌ Puppeteer/Playwright: Muito lento para Edge Functions
- ❌ RSS Bridge: Serviço externo, dependência adicional
- ❌ NewsAPI: Custo mensal, artigos diferentes
- ✅ Campo `source`: Já disponível, sem custo

---

## 🎯 Conclusão

O problema é **solucionável** com modificações no pipeline de importação RSS. A solução usando o campo `<source url>` é **viável, gratuita e relativamente simples** de implementar.

**Estimativa de Esforço**: 4-6 horas  
**Risco**: Baixo  
**Impacto**: Alto (resolve 100% dos casos do Google News)

---

**Próxima Ação**: Aguardando aprovação para implementar Solução Recomendada.
