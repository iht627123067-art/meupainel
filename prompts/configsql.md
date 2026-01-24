-- ==============================================================================
-- ESTRATÉGIA FINAL VALIDADA E EXECUTADA (Versão de Produção)
-- ==============================================================================
-- Este arquivo contém o SQL exato que resolveu os problemas de:
-- 1. Erro de UNIQUE constraint no Upsert (42P10)
-- 2. Erro de Enum inválido 'google_news' (22P02)
-- 3. Erro de permissão/zumbi no Cron Job (XX000/42501)
-- ==============================================================================

-- 1. CORREÇÃO DE ESTRUTURA E CONSTRAINTS (Deduplicação)
-- ==============================================================================

-- Passo 1.1: Normalizar dados para evitar conflitos de String Vazia
-- Isso é crítico pois Unique Constraints permitem múltiplos NULLs, mas travam com múltiplos ''
UPDATE alerts SET clean_url = NULL WHERE clean_url = '';

-- Passo 1.2: Adicionar valor 'google_news' ao ENUM (Correção do erro 22P02)
-- Necessário pois o trigger de pipeline enviava esse valor que não existia no tipo original
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'google_news';

-- Passo 1.3: Resetar Constraints e Índices Antigos para limpeza
-- É mais seguro dropar a CONSTRAINT (que leva o índice junto) do que tentar dropar o índice isolado
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_clean_url_key;
DROP INDEX IF EXISTS idx_alerts_clean_url_unique;

-- Passo 1.4: Aplicar a CONSTRAINT Oficial
-- Esta constraint é compatível com o .upsert(onConflict: 'clean_url') do Supabase JS
ALTER TABLE public.alerts 
ADD CONSTRAINT alerts_clean_url_key UNIQUE (clean_url);

-- (Opcional) Índice para performance de busca
CREATE INDEX IF NOT EXISTS idx_alerts_clean_url_perf ON public.alerts(clean_url);


-- 2. AGENDAMENTO DE JOBS (PG_CRON)
-- ==============================================================================

-- Passo 2.1: Ativação das Extensões (Comandos Idempotentes)
-- Executar apenas se ainda não estiverem ativas
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Passo 2.2: Limpeza de Jobs "Zumbis"
-- Remove forçadamente jobs antigos que possam estar em estado inconsistente (erro XX000 no unschedule)
DELETE FROM cron.job WHERE jobname = 'daily-gmail-sync';
DELETE FROM cron.job WHERE jobname = 'evening-gmail-sync';

-- Passo 2.3: Agendamento Oficial (Versão v2)
-- Executa diariamente as 12:00 UTC (09:00 BRT)
-- Usamos um nome novo 'daily-gmail-sync-v2' para evitar conflitos com registros fantasmas do sistema
SELECT cron.schedule(
  'daily-gmail-sync-v2',
  '0 12 * * *', 
  $$
  SELECT net.http_post(
    -- URL do Projeto (ID: peoyosdnthdpnhejivqo)
    url := 'https://peoyosdnthdpnhejivqo.supabase.co/functions/v1/trigger-gmail-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ==============================================================================
-- CHECKLIST DE VERIFICAÇÃO PÓS-EXECUÇÃO
-- ==============================================================================
/*
1. Verificar se a constraint existe:
   SELECT conname FROM pg_constraint WHERE conname = 'alerts_clean_url_key';

2. Verificar se o Job foi criado corretamente:
   SELECT * FROM cron.job;

3. Verificar Logs de Execução do Cron (Quando rodar):
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC;

4. Verificar se a Enum foi atualizada:
   SELECT enum_range(NULL::source_type);
*/