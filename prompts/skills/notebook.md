# Skills para Antigravity - Sistema Automatizado de Podcast

## 📋 Visão Geral

Este documento define as **skills necessárias** para implementar o sistema completo de curadoria de conteúdo e geração automática de podcasts no Antigravity.

**Sistema:** Meu Painel - Podcast Edition  
**Objetivo:** Automatizar desde coleta de emails até roteiro de podcast pronto  
**Plataforma:** Supabase + Edge Functions + Antigravity  

---

## 🎯 Categorias de Skills

### 1. **Database Management Skills**
### 2. **Content Extraction Skills**
### 3. **AI Classification Skills**
### 4. **Deduplication Skills**
### 5. **Podcast Generation Skills**
### 6. **Automation & Scheduling Skills**
### 7. **Monitoring & Analytics Skills**
### 8. **Integration Skills**

---

## 1️⃣ DATABASE MANAGEMENT SKILLS

### **Skill 1.1: PostgreSQL Schema Management**
**ID:** `db-schema-management`  
**Tipo:** Database Operation  

**Capacidades:**
- Criar e modificar tabelas no Supabase
- Gerenciar constraints e indexes
- Implementar Row Level Security (RLS)
- Executar migrations de schema

**Tabelas Gerenciadas:**
```yaml
tables:
  - alerts: Artigos coletados
  - extracted_content: Conteúdo extraído
  - ai_classifications: Classificações IA
  - linkedin_posts: Posts gerados
  - podcast_episodes: Roteiros de podcast
  - content_deduplication_log: Log de duplicatas
  - extraction_strategies_log: Log de estratégias
  - email_accounts: Contas Gmail
  - gmail_oauth_tokens: Tokens OAuth
  - email_sync_logs: Logs de sync
```

**Operações Comuns:**
```sql
-- Criar tabela
CREATE TABLE podcast_episodes (...)

-- Adicionar constraint
ALTER TABLE alerts ADD CONSTRAINT unique_clean_url UNIQUE (clean_url)

-- Habilitar RLS
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY
```

**Dependências:**
- PostgreSQL 14+
- Supabase CLI
- Extension: `pg_cron`, `pg_net`, `uuid-ossp`

---

### **Skill 1.2: Trigger & Function Creation**
**ID:** `db-triggers-functions`  
**Tipo:** Database Automation  

**Capacidades:**
- Criar funções PL/pgSQL
- Implementar triggers automáticos
- Usar `SECURITY DEFINER` corretamente
- Gerenciar event-driven workflows

**Triggers Principais:**
```yaml
triggers:
  - trigger_check_duplicates:
      table: alerts
      event: BEFORE INSERT
      function: mark_duplicate_alerts()
      
  - trigger_extract_content:
      table: alerts
      event: AFTER INSERT
      function: trigger_extract_content_function()
      
  - trigger_classify_content:
      table: extracted_content
      event: AFTER INSERT
      function: trigger_classify_content_function()
      
  - trigger_evaluate_extraction:
      table: extracted_content
      event: AFTER INSERT/UPDATE
      function: evaluate_and_schedule_retry()
```

**Exemplo de Função:**
```sql
CREATE OR REPLACE FUNCTION public.invoke_edge_function(
  function_name TEXT,
  payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Invoca Edge Function com service role
$$;
```

**Dependências:**
- Conhecimento de PL/pgSQL
- Entendimento de transaction isolation
- Service role key configurado

---

## 2️⃣ CONTENT EXTRACTION SKILLS

### **Skill 2.1: Multi-Strategy Content Extraction**
**ID:** `content-extraction-advanced`  
**Tipo:** Content Processing  

**Capacidades:**
- Extrair conteúdo de URLs usando múltiplas estratégias
- Fallback automático entre métodos
- Detecção de paywall
- Limpeza e formatação de HTML/Markdown

**Estratégias de Extração:**
```yaml
strategies:
  primary:
    - name: Jina Reader API
      endpoint: https://r.jina.ai/
      success_rate: 85%
      speed: fast
      
  fallback_1:
    - name: Cheerio Scraping
      method: DOM parsing
      success_rate: 70%
      speed: medium
      
  fallback_2:
    - name: Puppeteer Headless
      method: Browser automation
      success_rate: 90%
      speed: slow
      use_case: Paywall bypass
```

**Qualidade de Extração:**
```yaml
quality_metrics:
  excellent: word_count >= 300
  good: word_count >= 150
  partial: word_count >= 50
  failed: word_count < 50
```

**API Endpoint:**
```typescript
POST /functions/v1/extract-content-advanced
{
  "alert_id": "uuid",
  "url": "https://...",
  "use_advanced_strategies": true,
  "retry_attempt": 1
}
```

**Dependências:**
- Jina Reader API key
- Cheerio library
- Puppeteer (opcional)
- Supabase Edge Functions

---

### **Skill 2.2: Content Translation & Cleaning**
**ID:** `content-translation-cleaning`  
**Tipo:** Content Processing  

**Capacidades:**
- Tradução automática para PT-BR
- Limpeza de HTML/CSS/JS
- Remoção de ads e tracking
- Formatação em Markdown

**Providers de Tradução:**
```yaml
translation_providers:
  - OpenRouter (Gemini 2.0 Flash - free)
  - OpenAI (GPT-4o-mini)
  - Gemini Direct
```

**Pipeline de Limpeza:**
```yaml
cleaning_steps:
  1. Remove scripts/styles
  2. Remove tracking pixels
  3. Remove ads/popups
  4. Extract main content
  5. Convert to Markdown
  6. Translate (if needed)
  7. Calculate quality_score
```

**Dependências:**
- OpenRouter/OpenAI/Gemini API
- Cheerio para parsing
- Turndown para Markdown

---

## 3️⃣ AI CLASSIFICATION SKILLS

### **Skill 3.1: Content Relevance Classification**
**ID:** `ai-content-classifier`  
**Tipo:** AI Processing  

**Capacidades:**
- Classificar conteúdo por relevância
- Determinar categoria (linkedin/archive)
- Gerar confidence score (0-1)
- Explicar reasoning em português

**Prompt Template:**
```yaml
system_prompt: |
  Você é um especialista em curadoria de conteúdo tech/IA.
  Classifique artigos por relevância para LinkedIn profissional.

user_prompt: |
  Classifique este artigo:
  - "linkedin": Alta qualidade, relevante para profissionais
  - "archive": Clickbait, genérico, baixa qualidade
  
  Retorne JSON:
  {
    "destination": "linkedin" | "archive",
    "confidence_score": 0.0 - 1.0,
    "reasoning": "Explicação em português",
    "category": "IA" | "Tech" | "Business"
  }
```

**Fallback Cascade:**
```yaml
providers:
  1. OpenRouter (Gemini 2.0 Flash - free)
  2. OpenAI (GPT-4o-mini)
  3. Gemini Direct
  4. Rule-based fallback
```

**Auto-Approval Logic:**
```yaml
auto_approve_if:
  - destination == "linkedin"
  - confidence_score >= 0.8
  - word_count >= 150
```

**API Endpoint:**
```typescript
POST /functions/v1/classify-content
{
  "content_id": "uuid",
  "alert_id": "uuid",
  "title": "...",
  "text": "..."
}
```

**Dependências:**
- OpenRouter/OpenAI/Gemini API
- JSON parsing
- Error handling

---

## 4️⃣ DEDUPLICATION SKILLS

### **Skill 4.1: Content Hash Deduplication**
**ID:** `content-deduplication`  
**Tipo:** Data Quality  

**Capacidades:**
- Calcular hash de conteúdo (MD5)
- Detectar duplicatas por título + URL
- Detectar duplicatas por conteúdo similar
- Marcar e ignorar duplicatas automaticamente

**Algoritmo de Hash:**
```yaml
hash_calculation:
  input: title + normalized_url + content_preview
  method: MD5
  normalization:
    - Lowercase
    - Trim whitespace
    - Remove http(s)://www.
    - First 500 chars of content
```

**Detecção de Duplicatas:**
```yaml
duplicate_if:
  - content_hash matches (últimos 30 dias)
  OR
  - url_hash matches (últimos 30 dias)
  OR
  - title similarity > 90% AND same domain
```

**Ações Automáticas:**
```yaml
on_duplicate_detected:
  1. Mark alert status = 'duplicate'
  2. Log in content_deduplication_log
  3. Reference original_alert_id
  4. Skip all processing (extraction, classification)
  5. Send metrics to monitoring
```

**SQL Function:**
```sql
CREATE FUNCTION public.calculate_content_hash(
  title TEXT,
  url TEXT,
  content TEXT DEFAULT NULL
) RETURNS TEXT
```

**Dependências:**
- PostgreSQL MD5 function
- Trigger system
- 30-day rolling window

---

## 5️⃣ PODCAST GENERATION SKILLS

### **Skill 5.1: Intelligent Article Selection**
**ID:** `podcast-article-selector`  
**Tipo:** Content Curation  

**Capacidades:**
- Selecionar melhores artigos do dia
- Calcular score composto
- Filtrar duplicatas e baixa qualidade
- Respeitar limites min/max de artigos

**Score Composto:**
```yaml
scoring_formula:
  final_score = 
    (confidence_score * 0.4) +      # Relevância IA
    (word_count / 1000 * 0.3) +     # Tamanho conteúdo
    (quality_score * 0.3)           # Qualidade extração

weights:
  ai_relevance: 40%
  content_size: 30%
  extraction_quality: 30%
```

**Critérios de Seleção:**
```yaml
inclusion_criteria:
  - status NOT IN ('duplicate', 'archived')
  - word_count >= 100
  - destination = 'linkedin' OR destination IS NULL
  - created_at = target_date
  - NOT already_used_in_podcast

ranking:
  ORDER BY final_score DESC
  LIMIT max_articles (default: 10)
```

**SQL Query:**
```sql
WITH ranked_articles AS (
  SELECT 
    a.*,
    (
      COALESCE(ac.confidence_score, 0) * 0.4 +
      LEAST(ec.word_count / 1000.0, 1.0) * 0.3 +
      CASE WHEN ec.quality_score > 0.7 THEN 0.3 ELSE 0 END
    ) as final_score
  FROM alerts a
  INNER JOIN extracted_content ec ON ec.alert_id = a.id
  LEFT JOIN ai_classifications ac ON ac.alert_id = a.id
  WHERE a.created_at::date = target_date
  ORDER BY final_score DESC
  LIMIT 10
)
SELECT * FROM ranked_articles;
```

**Dependências:**
- Database views
- Composite scoring algorithm
- Date-based filtering

---

### **Skill 5.2: LLM Podcast Script Generation**
**ID:** `llm-podcast-scriptwriter`  
**Tipo:** AI Content Generation  

**Capacidades:**
- Gerar roteiros conversacionais de podcast
- Estruturar em formato markdown
- Otimizar para narração (15 min)
- Incluir transições e ênfases

**Prompt Engineering:**
```yaml
system_prompt: |
  Você é roteirista especializado em podcasts de tecnologia/IA.
  
  REGRAS:
  - Tom conversacional (como amigos conversando)
  - Introdução cativante
  - Transições suaves entre tópicos
  - Analogias e exemplos práticos
  - Destaque implicações reais
  - Conexões entre artigos
  - Duração: 15 minutos
  
  ESTRUTURA:
  - Abertura (30s)
  - Intro ao tema (1min)
  - 3-5 blocos principais (80%)
  - Encerramento (1min)
  
  FORMATO MARKDOWN:
  - Headers (##, ###)
  - [PAUSA] onde apropriado
  - [ÊNFASE] em pontos importantes
  - [TRANSIÇÃO] entre blocos

user_prompt: |
  Data: {date}
  Total de artigos: {count}
  
  Artigos:
  {articles_context}
  
  Crie roteiro profissional de podcast.
  Retorne JSON com:
  - title
  - description
  - script_markdown
  - metadata (duration, quality, sections, topics)
```

**Estrutura do Roteiro:**
```markdown
## [Título Atrativo do Episódio]

[ABERTURA - 30s]
Olá! Bem-vindo ao...

[PAUSA]

### Introdução ao Tema do Dia

Hoje vamos falar sobre [ÊNFASE] as principais novidades [/ÊNFASE]...

[TRANSIÇÃO]

### Primeira Notícia: [Título]

[Conteúdo conversacional...]

[TRANSIÇÃO]

### Segunda Notícia: [Título]

[Conteúdo...]

---

## Encerramento

Essas foram as principais notícias de hoje!
[Call to action]

🎧 Até amanhã!
```

**LLM Providers (Cascata):**
```yaml
providers:
  1:
    name: OpenRouter
    model: google/gemini-2.0-flash-exp:free
    cost: $0
    priority: 1
    
  2:
    name: OpenAI
    model: gpt-4o-mini
    cost: ~$0.01/request
    priority: 2
    
  3:
    name: Gemini Direct
    model: gemini-2.0-flash-exp
    cost: Free tier
    priority: 3
    
  fallback:
    name: Basic Template
    method: Template-based
    quality: Low
```

**Response Format:**
```json
{
  "title": "Tech em Foco: IA Revoluciona Indústria - 26/01/2026",
  "description": "Análise das últimas inovações em IA...",
  "script_markdown": "## Abertura\n\nOlá!...",
  "metadata": {
    "estimated_duration": 15,
    "quality_score": 0.95,
    "sections": ["Abertura", "IA", "Tech", "Encerramento"],
    "topics_covered": ["IA", "Inovação", "Startups"]
  }
}
```

**Edge Function:**
```typescript
// supabase/functions/generate-podcast-script/index.ts
serve(async (req) => {
  const payload = await req.json()
  const script = await generatePodcastScript(payload)
  return new Response(JSON.stringify(script))
})
```

**Dependências:**
- OpenRouter/OpenAI/Gemini API
- Edge Function runtime (Deno)
- JSON parsing & validation

---

## 6️⃣ AUTOMATION & SCHEDULING SKILLS

### **Skill 6.1: Cron Job Management**
**ID:** `cron-job-scheduling`  
**Tipo:** Task Automation  

**Capacidades:**
- Agendar tarefas recorrentes via pg_cron
- Gerenciar múltiplos jobs
- Monitorar execuções
- Retry em falhas

**Cron Jobs Configurados:**
```yaml
jobs:
  daily-gmail-sync:
    schedule: "0 8 * * *"  # 8h UTC
    function: trigger-gmail-sync
    description: Sincroniza emails do Gmail
    
  evening-gmail-sync:
    schedule: "0 18 * * *"  # 18h UTC
    function: trigger-gmail-sync
    description: Segunda sync do dia
    
  auto-generate-daily-podcasts:
    schedule: "0 9 * * *"  # 9h UTC
    function: auto_generate_daily_podcasts()
    description: Gera podcast diário
    dependencies: [daily-gmail-sync]
```

**SQL de Agendamento:**
```sql
-- Criar cron job
SELECT cron.schedule(
  'auto-generate-daily-podcasts',
  '0 9 * * *',
  $$SELECT public.auto_generate_daily_podcasts()$$
);

-- Listar jobs
SELECT * FROM cron.job;

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-generate-daily-podcasts')
ORDER BY start_time DESC
LIMIT 10;

-- Cancelar job
SELECT cron.unschedule('job-name');
```

**Monitoramento:**
```yaml
monitoring:
  - Check execution status
  - Log errors/warnings
  - Alert on failures
  - Track execution duration
  - Measure success rate
```

**Dependências:**
- Extension: `pg_cron`
- Extension: `pg_net`
- Service role permissions

---

### **Skill 6.2: Event-Driven Workflows**
**ID:** `event-driven-automation`  
**Tipo:** Workflow Orchestration  

**Capacidades:**
- Triggers baseados em eventos do banco
- Chamadas assíncronas para Edge Functions
- Retry automático em falhas
- Pipeline com dependências

**Event Flow:**
```yaml
workflow:
  event_1:
    trigger: INSERT INTO alerts
    condition: status = 'pending' AND clean_url IS NOT NULL
    action: invoke_edge_function('extract-content')
    async: true
    retry: 3
    
  event_2:
    trigger: INSERT INTO extracted_content
    condition: word_count >= 50
    action: invoke_edge_function('classify-content')
    async: true
    depends_on: event_1
    
  event_3:
    trigger: INSERT INTO ai_classifications
    condition: destination = 'linkedin' AND confidence >= 0.8
    action: invoke_edge_function('generate-linkedin-post')
    async: true
    depends_on: event_2
```

**Helper Function:**
```sql
CREATE FUNCTION public.invoke_edge_function(
  function_name TEXT,
  payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := payload
  ) INTO result;
  
  RETURN result;
END;
$$;
```

**Dependências:**
- Database triggers
- pg_net extension
- Service role key
- Edge Functions deployed

---

## 7️⃣ MONITORING & ANALYTICS SKILLS

### **Skill 7.1: Pipeline Health Monitoring**
**ID:** `pipeline-health-monitor`  
**Tipo:** Observability  

**Capacidades:**
- Rastrear métricas do pipeline
- Detectar gargalos
- Alertar sobre falhas
- Gerar relatórios diários

**Métricas Principais:**
```yaml
metrics:
  ingestion:
    - total_alerts_today
    - alerts_by_source (rss, gmail)
    - duplicate_rate
    
  extraction:
    - extraction_success_rate
    - avg_word_count
    - failed_extractions
    - retry_needed
    
  classification:
    - classification_rate
    - avg_confidence_score
    - linkedin_vs_archive_ratio
    
  podcast:
    - podcasts_generated_today
    - avg_articles_per_episode
    - avg_quality_score
    - avg_duration
```

**Views de Monitoramento:**
```sql
-- Pipeline Health
CREATE VIEW pipeline_health AS
SELECT 
  COUNT(DISTINCT a.id) as total_alerts,
  COUNT(DISTINCT ec.id) as extracted_count,
  COUNT(DISTINCT ac.id) as classified_count,
  COUNT(DISTINCT pe.id) as podcasts_generated,
  ROUND(100.0 * COUNT(DISTINCT ec.id) / NULLIF(COUNT(DISTINCT a.id), 0), 2) as extraction_rate,
  ROUND(100.0 * COUNT(DISTINCT ac.id) / NULLIF(COUNT(DISTINCT ec.id), 0), 2) as classification_rate
FROM alerts a
LEFT JOIN extracted_content ec ON ec.alert_id = a.id
LEFT JOIN ai_classifications ac ON ac.alert_id = a.id
LEFT JOIN podcast_episodes pe ON a.id = ANY(pe.article_ids)
WHERE a.created_at >= CURRENT_DATE;

-- Podcast Stats
CREATE VIEW podcast_daily_stats AS
SELECT 
  episode_date,
  COUNT(DISTINCT id) as episodes_generated,
  SUM(total_articles) as total_articles_used,
  AVG(quality_score) as avg_quality_score,
  AVG(estimated_duration_minutes) as avg_duration
FROM podcast_episodes
WHERE episode_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY episode_date
ORDER BY episode_date DESC;
```

**Alertas:**
```yaml
alerts:
  - name: Low Extraction Rate
    condition: extraction_rate < 70%
    action: Send notification
    
  - name: No Podcast Generated
    condition: podcasts_generated = 0 AND time > 10:00 UTC
    action: Trigger manual retry
    
  - name: High Duplicate Rate
    condition: duplicate_rate > 40%
    action: Review sources
```

**Dependências:**
- Database views
- Metrics collection
- Notification system

---

### **Skill 7.2: Error Logging & Debugging**
**ID:** `error-logging-debugging`  
**Tipo:** Troubleshooting  

**Capacidades:**
- Log de erros estruturado
- Rastreamento de falhas
- Debug de Edge Functions
- Análise de root cause

**Log Structure:**
```yaml
log_entry:
  timestamp: ISO 8601
  level: ERROR | WARN | INFO
  component: extraction | classification | podcast
  alert_id: UUID
  message: Human-readable description
  details: JSON object
  stack_trace: String (if error)
```

**Common Errors:**
```yaml
errors:
  - code: EXT_001
    message: "Extraction failed: timeout"
    retry: true
    max_retries: 3
    
  - code: EXT_002
    message: "Paywall detected"
    retry: false
    action: Mark for manual review
    
  - code: AI_001
    message: "Classification API error"
    retry: true
    fallback: Rule-based classification
    
  - code: POD_001
    message: "Insufficient articles for podcast"
    retry: false
    action: Skip day
```

**Debugging Queries:**
```sql
-- Ver extrações falhadas
SELECT * FROM problematic_extractions;

-- Ver artigos travados
SELECT 
  a.id, a.title, a.status,
  CASE 
    WHEN ec.id IS NULL THEN 'Pending extraction'
    WHEN ac.id IS NULL THEN 'Pending classification'
    ELSE 'Unknown issue'
  END as stuck_at
FROM alerts a
LEFT JOIN extracted_content ec ON ec.alert_id = a.id
LEFT JOIN ai_classifications ac ON ac.alert_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND a.status NOT IN ('published', 'archived');

-- Ver logs de Edge Functions
SELECT * FROM extensions.pg_net_logs
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Dependências:**
- Structured logging
- Error tracking tables
- pg_net logs

---

## 8️⃣ INTEGRATION SKILLS

### **Skill 8.1: NotebookLM Integration**
**ID:** `notebooklm-integration`  
**Tipo:** External Service  

**Capacidades:**
- Exportar roteiro em formato compatível
- Preparar markdown otimizado
- Gerar metadata para NotebookLM
- (Futuro) API automation

**Formato de Exportação:**
```yaml
export_format:
  file_type: .md (Markdown)
  encoding: UTF-8
  structure:
    - Front matter (YAML)
    - Título do episódio
    - Descrição
    - Roteiro completo
    - Metadata
```

**Markdown Template:**
```markdown
---
title: "Tech em Foco - 26/01/2026"
date: "2026-01-26"
duration: "15 minutes"
topics: ["IA", "Tecnologia", "Inovação"]
---

# Tech em Foco - 26 de Janeiro de 2026

**Descrição:** Análise das últimas novidades...

---

## Abertura

Olá! Bem-vindo ao...

[Roteiro completo...]

---

## Metadata

- **Artigos incluídos:** 7
- **Qualidade:** 0.95/1.0
- **Tópicos:** IA, Startups, Cloud Computing
```

**Export Query:**
```sql
-- Exportar roteiro de hoje
SELECT 
  '---
title: "' || title || '"
date: "' || episode_date || '"
duration: "' || estimated_duration_minutes || ' minutes"
topics: ' || array_to_json(script_metadata->'topics_covered') || '
---

' || script_markdown as notebooklm_export
FROM podcast_episodes
WHERE episode_date = CURRENT_DATE;
```

**Workflow Manual (até API disponível):**
```yaml
steps:
  1. Query database para roteiro
  2. Copiar markdown
  3. Salvar como podcast_YYYY-MM-DD.md
  4. Acessar notebooklm.google.com
  5. New Notebook
  6. Upload markdown file
  7. Generate Audio Overview
  8. Download MP3
  9. Update podcast_episodes.notebooklm_url
```

**Dependências:**
- Markdown formatting
- File generation
- Manual upload (por enquanto)

---

### **Skill 8.2: Gmail OAuth Integration**
**ID:** `gmail-oauth-integration`  
**Tipo:** External API  

**Capacidades:**
- Autenticação OAuth2 com Google
- Refresh de tokens automaticamente
- Sincronização de emails
- Parsing de Google Alerts HTML

**OAuth Flow:**
```yaml
oauth_flow:
  1. User clicks "Conectar Gmail"
  2. Redirect to Google consent screen
  3. User approves permissions
  4. Google returns authorization code
  5. Exchange code for tokens (Edge Function)
  6. Store encrypted tokens in gmail_oauth_tokens
  7. Use refresh_token for auto-renewal
```

**Scopes Necessários:**
```yaml
scopes:
  - https://www.googleapis.com/auth/gmail.readonly
  - https://www.googleapis.com/auth/gmail.modify
```

**Token Management:**
```sql
-- Salvar tokens
INSERT INTO gmail_oauth_tokens (
  email_account_id,
  access_token,
  refresh_token,
  token_expires_at
) VALUES (...);

-- Refresh token automaticamente
CREATE FUNCTION refresh_gmail_token(account_id UUID)
RETURNS JSONB
-- Chama Google Token API
-- Atualiza gmail_oauth_tokens
```

**Email Sync:**
```typescript
// Edge Function: sync-gmail
async function syncGmail(accessToken: string) {
  const gmail = google.gmail({ version: 'v1', auth: accessToken })
  
  // Buscar emails com label "Alertas"
  const messages = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['ALERTAS'],
    q: 'is:unread'
  })
  
  // Para cada email
  for (const message of messages) {
    const content = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'full'
    })
    
    // Parse HTML do Google Alert
    const articles = parseGoogleAlertHTML(content.payload)
    
    // Inserir em alerts table
    await supabase.from('alerts').insert(articles)
    
    // Marcar como lido
    await gmail.users.messages.modify({
      userId: 'me',
      id: message.id,
      requestBody: { removeLabelIds: ['UNREAD'] }
    })
  }
}
```

**Dependências:**
- Google OAuth2 credentials
- googleapis npm package
- Edge Function for token exchange
- Encrypted storage

---

## 🔧 CONFIGURAÇÃO E DEPLOYMENT

### **Environment Variables Necessárias**

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Database Config (no Dashboard)
app.supabase_url=https://your-project.supabase.co
app.supabase_service_role_key=eyJh...

# AI Providers
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...

# Google OAuth
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://your-project.supabase.co/functions/v1/exchange-gmail-token

# Content Extraction
JINA_API_KEY=jina_...
```

---

## 🚀 DEPLOYMENT CHECKLIST

```yaml
deployment_steps:
  database:
    - [ ] Execute SQL migrations
    - [ ] Create all tables
    - [ ] Set up RLS policies
    - [ ] Create triggers
    - [ ] Create functions
    - [ ] Enable extensions (pg_cron, pg_net)
    - [ ] Configure environment variables