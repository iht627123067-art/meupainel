# Diretrizes de Uso do Google Gemini

Este documento estabelece as regras e padrões para a integração e uso dos modelos Google Gemini neste projeto.

## 1. Modelos e Caminhos Principais

### Modelo Padrão
- **Gemini 2.5 Flash**: Deve ser utilizado como o modelo padrão para todas as operações de chat, automação e respostas gerais via API. Prioriza-se este modelo pela eficiência de custo e latência.

### Modelo de Fallback (Alta Complexidade)
- **Gemini 2.5 Pro**: Utilize este modelo **apenas** quando a tarefa exigir:
  - Raciocínio profundo e complexo
  - Múltiplas etapas lógicas
  - Explicações extremamente detalhadas
  - Análise jurídica ou técnica aprofundada
  
  > **Nota**: Sempre que possível, sinalize no código ou na documentação da chamada que o `Gemini 2.5 Pro` está sendo usado como fallback para aquela requisição específica.

### Embeddings e Busca Vetorial
- **Modelo**: `text-embedding-004`
- **Dimensão**: 768 dimensões
- **Banco de Dados**: Compatível com colunas `vector(768)` no Supabase.
- **Uso**: Busca semântica, similaridade de texto, RAG (Retrieval-Augmented Generation) e indexação.

---

## 2. Regras Gerais de Comportamento

1.  **Simplicidade por Padrão**: Para perguntas simples ou factuais, responda de forma objetiva usando **apenas** o `Gemini 2.5 Flash`.
2.  **Identificação de Complexidade**: Ao identificar uma tarefa complexa (planejamento detalhado, comparação extensa, etc.), indique explicitamente no raciocínio que a troca para o `Gemini 2.5 Pro` é recomendada.
3.  **Transparência Oculta**: Nunca mencione internamente detalhes de infraestrutura como "tokens", "latência" ou "preços" nas respostas ao usuário final. A prioridade interna é sempre o modelo mais leve (`2.5 Flash`) quando a qualidade permitir.
4.  **Consistência de Vetores**: Assuma sempre que o sistema RAG utiliza embeddings gerados pelo `text-embedding-004` (768 dims) e que as buscas no Supabase são feitas via similaridade de vetores (cosine distance ou inner product).

---

## 3. Regras Específicas para RAG com Supabase

1.  **Atribuição de Fonte**: Sempre que a resposta for gerada usando contexto de uma base de conhecimento (documentos, FAQs, registros), deixe claro que a informação se baseia nos documentos recuperados.
2.  **Honestidade Intelectual**: Se o contexto recuperado não for suficiente para responder à pergunta, **peça mais detalhes** ao usuário. Não invente ou alucine informações não presentes no contexto.
3.  **Tratamento do Conteúdo Recuperado**:
    - Resuma e reorganize o texto para fluidez.
    - Evite copiar blocos grandes de texto literalmente (verbatim).
    - Aponte incertezas ou contradições caso existam conflitos entre os documentos recuperados.
4.  **Fluxo RAG Padronizado**:
    - **Entrada**: Texto do usuário.
    - **Processamento**: Geração de embedding (`text-embedding-004`, 768 dims).
    - **Busca**: Consulta de vetores similares na tabela Supabase (`vector(768)`).
    - **Geração**: Envio dos trechos recuperados como contexto para o `Gemini 2.5 Flash` produzir a resposta final.

---

## 4. Regras para Projetos Pequenos / Testes / Protótipos

1.  **Configuração Padrão (Stack Recomendada)**:
    - **Chat**: Gemini 2.5 Flash.
    - **Embeddings**: `text-embedding-004` + Supabase `vector(768)`.
2.  **Exemplos e Sugestões**: Ao fornecer exemplos de código ou arquitetura, use sempre essa combinação como padrão, destacando-a como uma configuração simples, estável e eficiente para começar.
3.  **Arquitetura**:
    - Indique chamadas de chat (`2.5 Flash`) em APIs, Edge Functions ou backends.
    - Indique geração e armazenamento de embeddings no Supabase usando `pgvector`.

---

## 5. Estilo de Resposta

1.  **Estrutura**: Utilize listas (`-`) e passos numerados (`1.`) sempre que descrever processos, fluxos ou tutoriais (ex: "Como configurar o RAG").
2.  **Clareza**: Evite jargão técnico desnecessário. Se um termo técnico for indispensável, forneça uma breve explicação.
3.  **Abstração de Acesso**: Nunca afirme ou dê a entender que você (a IA) tem acesso direto ("live") ao banco de dados Supabase do usuário. Descreva apenas o comportamento esperado, as queries SQL necessárias e os passos para o desenvolvedor implementar a integração.
