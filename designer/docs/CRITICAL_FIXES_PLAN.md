# Plano de Correções Críticas - Meupainel

## 🎯 Objetivo
Corrigir os problemas introduzidos após a implementação do podcast, priorizando segurança, funcionalidade e performance.

---

## 📋 Problemas Identificados

### 🔴 **CRÍTICOS** (Impedem funcionamento)
1. **RLS desabilitado** na tabela `podcast_episodes`
2. **Edge Function `calculate-user-dna` não existe** (trigger falha)
3. **5 funções com `search_path` mutável** (vulnerabilidade de segurança)

### 🟡 **IMPORTANTES** (Degradam performance/segurança)
4. **Falta de índices** em chaves estrangeiras
5. **Políticas RLS duplicadas** (overhead)
6. **Migration incompleta** (faltam políticas RLS)

---

## 🔧 Plano de Implementação

### **FASE 1: Correções de Segurança e RLS** ⚡ (PRIORIDADE MÁXIMA)

#### 1.1 Habilitar RLS na tabela `podcast_episodes`
```sql
-- Migration: 20260127_fix_podcast_episodes_rls.sql
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own episodes"
ON public.podcast_episodes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own episodes"
ON public.podcast_episodes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own episodes"
ON public.podcast_episodes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own episodes"
ON public.podcast_episodes FOR DELETE
USING (auth.uid() = user_id);
```

#### 1.2 Criar Edge Function `calculate-user-dna`
```typescript
// supabase/functions/calculate-user-dna/index.ts
import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { user_id } = await req.json();

  // Buscar interações do usuário
  const { data: interactions } = await supabase
    .from("user_article_interactions")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Calcular DNA baseado em interações
  const categories = {};
  const sources = {};
  
  interactions?.forEach((interaction) => {
    // Lógica de cálculo de preferências
    if (interaction.category) {
      categories[interaction.category] = (categories[interaction.category] || 0) + 1;
    }
  });

  // Atualizar user_content_dna
  await supabase
    .from("user_content_dna")
    .upsert({
      user_id,
      preferred_categories: Object.keys(categories).slice(0, 5),
      updated_at: new Date().toISOString(),
    });

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

#### 1.3 Corrigir `search_path` mutável nas funções
```sql
-- Migration: 20260127_fix_function_search_path.sql

-- Função: calculate_content_score
DROP FUNCTION IF EXISTS public.calculate_content_score(UUID);
CREATE OR REPLACE FUNCTION public.calculate_content_score(p_alert_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- FIX: search_path imutável
AS $$
DECLARE
  v_score NUMERIC := 0;
BEGIN
  -- Lógica existente...
  RETURN v_score;
END;
$$;

-- Repetir para todas as 5 funções afetadas
```

---

### **FASE 2: Otimização de Performance** 🚀

#### 2.1 Adicionar índices em chaves estrangeiras
```sql
-- Migration: 20260127_add_missing_indexes.sql

-- Índices para podcast_episodes
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_user_id 
ON public.podcast_episodes(user_id);

CREATE INDEX IF NOT EXISTS idx_podcast_episodes_created_at 
ON public.podcast_episodes(created_at DESC);

-- Índices para user_article_interactions
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id 
ON public.user_article_interactions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_interactions_alert_id 
ON public.user_article_interactions(alert_id);

-- Índices para user_content_dna
CREATE INDEX IF NOT EXISTS idx_user_content_dna_user_id 
ON public.user_content_dna(user_id);
```

#### 2.2 Remover políticas RLS duplicadas
```sql
-- Migration: 20260127_cleanup_duplicate_rls.sql

-- Listar e remover duplicatas
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename, policyname
    HAVING COUNT(*) > 1
  LOOP
    -- Manter apenas a primeira política, remover duplicatas
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      policy_record.policyname, 
      policy_record.schemaname, 
      policy_record.tablename
    );
  END LOOP;
END $$;
```

---

### **FASE 3: Validação e Testes** ✅

#### 3.1 Verificar RLS
```sql
-- Testar como usuário autenticado
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

-- Deve retornar apenas episódios do usuário
SELECT * FROM podcast_episodes;

-- Deve permitir inserção
INSERT INTO podcast_episodes (user_id, title, script) 
VALUES ('user-uuid-here', 'Test', 'Test script');
```

#### 3.2 Testar Edge Function
```bash
# Deploy da função
supabase functions deploy calculate-user-dna

# Testar invocação
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/calculate-user-dna \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"user_id": "user-uuid-here"}'
```

#### 3.3 Verificar Performance
```sql
-- Verificar uso de índices
EXPLAIN ANALYZE 
SELECT * FROM podcast_episodes 
WHERE user_id = 'user-uuid-here' 
ORDER BY created_at DESC;

-- Deve mostrar "Index Scan" ao invés de "Seq Scan"
```

---

## 📊 Ordem de Execução

1. ✅ **FASE 1.1**: Habilitar RLS em `podcast_episodes` (5 min)
2. ✅ **FASE 1.2**: Criar Edge Function `calculate-user-dna` (15 min)
3. ✅ **FASE 1.3**: Corrigir `search_path` nas funções (10 min)
4. ✅ **FASE 2.1**: Adicionar índices (5 min)
5. ✅ **FASE 2.2**: Remover políticas duplicadas (5 min)
6. ✅ **FASE 3**: Validação completa (10 min)

**Tempo total estimado**: ~50 minutos

---

## 🎯 Resultados Esperados

### Antes ❌
- ❌ Página `/content` quebrada (erro de acesso)
- ❌ Geração de podcast falha silenciosamente
- ❌ Trigger `update_user_dna_on_interaction` com erro 500
- ❌ Queries lentas em tabelas grandes
- ⚠️ 5 vulnerabilidades de segurança

### Depois ✅
- ✅ Página `/content` funcional
- ✅ Geração de podcast operacional
- ✅ DNA do usuário atualizado automaticamente
- ✅ Performance otimizada (queries 3-5x mais rápidas)
- ✅ Todas as vulnerabilidades corrigidas

---

## 🔍 Checklist de Verificação Final

- [ ] RLS habilitado em todas as tabelas sensíveis
- [ ] Todas as Edge Functions deployadas e funcionais
- [ ] Índices criados e sendo utilizados
- [ ] Políticas RLS sem duplicatas
- [ ] Funções com `search_path` seguro
- [ ] Testes manuais em `/content`, `/podcast`, `/alerts`
- [ ] Logs do Supabase sem erros 500
- [ ] Performance aceitável (< 200ms para queries principais)

---

## 📝 Notas Importantes

> **⚠️ ATENÇÃO**: Execute as migrations em ordem sequencial. Não pule etapas.

> **💡 DICA**: Faça backup do banco antes de aplicar as migrations:
> ```bash
> supabase db dump -f backup_pre_fixes.sql
> ```

> **🔒 SEGURANÇA**: Após aplicar as correções, execute o advisor de segurança:
> ```typescript
> await supabase.rpc('get_advisors', { type: 'security' });
> ```
