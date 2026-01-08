# Análise Crítica do Pipeline Atual

## Diagnóstico
O pipeline atual, baseado em Supabase Edge Functions, apresenta fragilidades estruturais críticas que comprometem sua confiabilidade, especialmente nas etapas de ingestão e processamento de dados externos.

### Principais Problemas Identificados

1.  **Parsing de HTML com Regex (`process-gmail`)**:
    *   **Crítico**: A função utiliza Expressões Regulares (Regex) para extrair dados de emails HTML (`<tr[^>]*itemscope...`).
    *   **Consequência**: Qualquer alteração mínima no layout do Gmail ou do Google Alerts quebra a extração silenciosamente ou gera dados corrompidos. Regex não é uma ferramenta adequada para parser de HTML estruturado.

2.  **Resolução de URLs Instável (`extract-content`)**:
    *   **Crítico**: A função `resolveGoogleNewsUrl` depende de um simples `fetch`. O Google News frequentemente bloqueia requisições automatizadas (retornando páginas de consentimento ou captchas), fazendo com que a URL "resolvida" seja inválida.
    *   **Consequência**: O extrator tenta ler o conteúdo da página de bloqueio do Google em vez da notícia real.

3.  **Dependência Externa Frágil (`extract-content`)**:
    *   **Risco**: O uso do `r.jina.ai` é excelente, mas o fallback (`fallbackExtraction`) atual é rudimentar (também baseado em Regex para limpar HTML).
    *   **Consequência**: Se o serviço Jina falhar ou atingir limites, a qualidade do conteúdo extraído cai drasticamente.

4.  **Arquitetura "Serverless Chain"**:
    *   **Risco**: Funções Edge têm tempo de execução limitado (Timeouts). Processos complexos de scraping e resolução de redirecionamentos em série podem exceder esses limites, causando falhas "invisíveis" onde o status no banco nunca é atualizado.

## Soluções Propostas

### A. Melhoria Imediata (Refatoração do Código Atual)
Manter a infraestrutura atual (Supabase), mas substituir as implementações frágeis por bibliotecas robustas.
1.  **Adotar `cheerio`**: Substituir todo o parsing Regex no `process-gmail` e `extract-content` pela biblioteca `cheerio` (jQuery para servidor), garantindo navegação robusta no DOM.
2.  **Melhorar Resolução de URL**: Implementar decodificação de parâmetros de URL antes de tentar o fetch, evitando bloqueios do Google News.

### B. Alternativa Robusta (Inspirada em `prompts/help.md`)
Criar um **Worker Python** independente.
*   **Vantagem**: Python possui o ecossistema mais forte para processamento de dados (`BeautifulSoup`, `playwright`, `google-api-python-client`).
*   **Funcionamento**: Um script que roda localmente (ou em VPS) e substitui as Edge Functions de ingestão. Ele conecta no Supabase apenas para ler/gravar dados.

## Plano de Ação
Vou proceder com a **Opção A (Melhoria Imediata)** pois resolve os problemas mais graves sem exigir que você configure um novo ambiente Python/Servidor agora. Se os problemas persistirem, podemos migrar para a Opção B.

### Próximos Passos:
1.  Reescrever `process-gmail/index.ts` usando `cheerio`.
2.  Blindar `extract-content/index.ts` contra falhas de redirecionamento.
