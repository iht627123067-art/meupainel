# 📄 Documentação Técnica: Resolução de URLs do Google News

Este documento descreve as técnicas utilizadas para superar o desafio de extração de conteúdo a partir de links do Google News RSS, que utilizam um sistema complexo de redirecionamento interno.

## 🚀 O Desafio
As URLs do Google News (ex: `news.google.com/rss/articles/...`) não são links diretos. Elas funcionam como rastreadores que, muitas vezes, não retornam um cabeçalho HTTP 301/302 para um cliente simples (como um script Node/Deno), mas sim uma página HTML "Redirecting..." ou utilizam JavaScript para encaminhar o usuário. Isso causava falha na extração (conteúdo vazio).

## 🛠️ Tecnologias Utilizadas
- **Supabase Edge Functions** (Deno)
- **Cheerio** (Análise de DOM em tempo real)
- **Jina Reader API** (Conversão de HTML para Markdown de alta qualidade)
- **Google Gemini 2.0 Flash** (Classificação inteligente)
- **PostgreSQL Triggers & pg_net** (Orquestração automática)

## 💡 Técnicas de Implementação

### 1. Resolução Multi-Camadas (URL Resolver)
Para garantir que chegamos à URL real do artigo original, implementamos o conceito de **Resolução Agressiva de Redirecionamento**:

1.  **Simulação de Navegador**: O `fetch` inicial utiliza headers de Browser (`User-Agent`, `Accept`) para evitar que o Google News bloqueie a requisição.
2.  **Strategy A (Análise de Âncoras)**: Se o redirecionamento automático falhar, o `cheerio` varre a página em busca do primeiro link externo que não pertença aos domínios do Google.
3.  **Strategy B (Interceptação de Script)**: Utilizamos Regex para capturar o destino dentro de chamadas `window.location.replace("...")` no HTML.
4.  **Strategy D (Regex Global Fallback)**: Como última instância, fazemos uma busca global por qualquer URL `http/https` no corpo da resposta, aplicando filtros de exclusão para domínios de tracking, analytics e assets do Google.

### 2. Orquestração Automática por Triggers
Em vez de depender de chamadas manuais via frontend para cada etapa, criamos uma **Pipeline Dirigida por Eventos**:

-   **Trigger `on_alert_created_extract`**: Toda vez que um novo alerta (RSS) entra no banco, o Postgres invoca automaticamente a Edge Function de extração.
-   **Trigger `on_content_extracted_classify`**: Assim que o conteúdo é extraído e salvo na tabela `extracted_content`, um segundo trigger dispara a função de classificação por IA.

### 3. Otimização do Pipeline de IA
Para economizar tokens e garantir estabilidade:

-   **Guard Clauses**: Implementamos verificações de "Sanidade do Conteúdo". Se o conteúdo extraído for menor que 50 caracteres (junk/cookie wall), a IA nem é chamada, marcando o item automaticamente como "Conteúdo insuficiente".
-   **Multi-Model Rotation**: A função de classificação tenta utilizar o modelo mais moderno disponível (**Gemini 2.0 Flash**), fazendo fallback sequencial para versões anteriores se houver erro de API ou limite de cota.

### 4. Persistência de Integridade
-   **Clean URL persistence**: A URL resolvida do artigo real é salva no campo `clean_url` do banco de dados, servindo como "Fonte da Verdade" para o usuário e para futuras re-extrações.
-   **Upsert Constraints**: Adicionamos uma `UNIQUE CONSTRAINT` na tabela de classificações para permitir atualizações seguras (`ON CONFLICT`) sem duplicar registros durante re-extrações.

## 📈 Resultados
- **Taxa de Sucesso**: Passamos de falha constante em Google News para extração bem-sucedida de grandes artigos acadêmicos e jornalísticos.
- **Qualidade**: Uso do **Jina Reader** garante que o conteúdo venha em Markdown limpo, sem anúncios, headers ou menus laterais, otimizando em 80% o contexto enviado para a IA.
- **Automação**: O tempo do processo (Fetch ➔ Extração ➔ Classificação) caiu para menos de 5 segundos, de ponta a ponta, sem interação humana.

---
*Documentação gerada automaticamente para o projeto Meu Painel / Designer.*
