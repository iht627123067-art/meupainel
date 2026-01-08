O Gemini 2.5 Flash é nosso melhor modelo em termos de preço e desempenho e oferece recursos abrangentes. O Gemini 2.5 Flash é nosso primeiro modelo Flash com [capacidade de raciocínio](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking?hl=pt-br), que permite ver o processo de pensamento do modelo ao gerar a resposta.

Para informações técnicas ainda mais detalhadas sobre o Gemini 2.5 Flash (como comparativos de performance, informações sobre nossos conjuntos de dados de treinamento, esforços de sustentabilidade, uso e limitações pretendidos e nossa abordagem de ética e segurança), consulte nosso [relatório técnico](https://storage.googleapis.com/deepmind-media/gemini/gemini_v2_5_report.pdf) sobre os modelos do Gemini 2.5.

[Testar na Vertex AI](https://console.cloud.google.com/vertex-ai/generative/multimodal/create/text?model=gemini-2.5-flash&hl=pt-br) [Ver no Model Garden](https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/gemini-2.5-flash?hl=pt-br)

| ID do modelo                  | `gemini-2.5-flash` |
| ----------------------------- | ------------------ |
| Entradas e saídas compatíveis | -   Entradas:      |
    
    Texto, Código, Imagens, Áudio, Vídeo
    
-   Saídas:
    
    Texto|
|Limites de tokens|-   Máximo de tokens de entrada: 1.048.576
-   Máximo de tokens de saída: 65.535 (padrão)|
|Recursos|-   Sim
-   [Embasamento com a Pesquisa Google](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search?hl=pt-br)
-   [Execução de código](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/code-execution?hl=pt-br)
-   [Ajuste](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/tune-models?hl=pt-br)
-   [Instruções do sistema](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/system-instruction-introduction?hl=pt-br)
-   [Saída estruturada](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output?hl=pt-br)
-   [Chamadas de função](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling?hl=pt-br)
-   [Contar tokens](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/get-token-count?hl=pt-br)
-   [Pensar](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking?hl=pt-br)
-   [Armazenamento em cache de contexto implícito](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview?hl=pt-br)
-   [Armazenamento em cache de contexto explícito](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview?hl=pt-br)
-   [Mecanismo RAG da Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-overview?hl=pt-br)
-   [Conclusões de chat](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/migrate/openai/overview?hl=pt-br)
-   Sem suporte
-   [API Gemini Live](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api?hl=pt-br)|
|Tipos de uso|-   Sim
-   [Capacidade de processamento provisionada](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput?hl=pt-br)
-   [Cota compartilhada dinâmica](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/dsq?hl=pt-br)
-   [Previsão em lote](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini?hl=pt-br)
-   Sem suporte
-   [Cota fixa](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/quotas?hl=pt-br)|
|Limite de tamanho da entrada|500 MB|
|Especificações técnicas|
|**Imagens**|-   Máximo de imagens por comando: 3.000
-   Tamanho máximo por arquivo para dados inline ou uploads diretos pelo console: 7 MB
-   Tamanho máximo de cada arquivo do Google Cloud Storage: 30 MB
-   Tipos MIME compatíveis:
    
    `image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif`|
|**Documentos**|-   Número máximo de arquivos por comando: 3.000
-   Número máximo de páginas por arquivo: 1.000
-   Tamanho máximo de arquivo para importações da API ou do Cloud Storage: 50 MB
-   Tamanho máximo por arquivo para uploads diretos pelo console: 7 MB
-   Tipos MIME compatíveis:
    
    `application/pdf`, `text/plain`|
|**Vídeo**|-   Duração máxima do vídeo (com áudio): Aproximadamente 45 minutos
-   Duração máxima do vídeo (sem áudio): aproximadamente 1 hora
-   Número máximo de vídeos por comando: 10
-   Tipos MIME aceitos:
    
    `video/x-flv`, `video/quicktime`, `video/mpeg`, `video/mpegs`, `video/mpg`, `video/mp4`, `video/webm`, `video/wmv`, `video/3gpp`|
|**Áudio**|-   Duração máxima do áudio por solicitação: Aproximadamente 8, 4 horas ou até 1 milhão de tokens
-   Número máximo de arquivos de áudio por comando: 1
-   Entendimento de fala para: Resumo, transcrição e tradução de áudio
-   Tipos MIME aceitos:
    
    `audio/x-aac`, `audio/flac`, `audio/mp3`, `audio/m4a`, `audio/mpeg`, `audio/mpga`, `audio/mp4`, `audio/ogg`, `audio/pcm`, `audio/wav`, `audio/webm`|
|**Padrões de parâmetros**|-   Temperatura: 0,0 a 2,0 (padrão 1,0)
-   topP: 0,0-1,0 (padrão 0,95)
-   topK: 64 (corrigido)
-   candidateCount: 1 a 8 (padrão: 1)|
|Regiões compatíveis|
|Disponibilidade do modelo
(Inclui cota compartilhada dinâmica e capacidade de transmissão provisionada)|-   Global
-   global
-   Estados Unidos
-   us-central1
-   us-east1
-   us-east4
-   us-east5
-   us-south1
-   us-west1
-   us-west4
-   Europa
-   europe-central2
-   europe-north1
-   europe-southwest1
-   europe-west1
-   europe-west4
-   europe-west8|
|Processamento de ML|-   Estados Unidos
-   Multirregional
-   Canadá
-   northamerica-northeast1
-   Europa
-   Multirregional
-   europe-west2
-   europe-west3
-   europe-west9
-   Ásia-Pacífico
-   asia-northeast1
-   asia-northeast3
-   asia-south1
-   asia-southeast1
-   australia-southeast1|
|Consulte [Implantações e endpoints](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations?hl=pt-br) para mais informações.|
|Data do limite de conhecimento|Janeiro de 2025|
|Versões|-   `gemini-2.5-flash`
-   Etapa do lançamento: GA
-   Data de lançamento: 17 de junho de 2025
-   Data de descontinuação: 17 de junho de 2026
-   `gemini-live-2.5-flash`
-   Etapa de lançamento: disponibilidade geral particular
-   Data de lançamento: 17 de junho de 2025|
|Controles de segurança|
|Consulte [Controles de segurança](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/security-controls?hl=pt-br) para mais informações.|
|Idiomas compatíveis|Consulte [Idiomas aceitos](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models?hl=pt-br#expandable-1).|
|Preços|Consulte a seção [Preços](https://docs.cloud.google.com/vertex-ai/generative-ai/pricing?hl=pt-br).|

[Testar na Vertex AI](https://console.cloud.google.com/vertex-ai/generative/multimodal/create/text?model=gemini-2.5-flash-preview-09-2025&hl=pt-br) [(prévia) Implantar app de exemplo](https://console.cloud.google.com/vertex-ai/studio/multimodal?suggestedPrompt=How+does+AI+work&deploy=true&model=gemini-2.5-flash-preview-09-2025&hl=pt-br)

Observação: para usar o recurso "Implantar app de exemplo", você precisa de um projeto do Google Cloud com o faturamento e a API Vertex AI ativados.

| ID do modelo                  | `gemini-2.5-flash-preview-09-2025` |
| ----------------------------- | ---------------------------------- |
| Entradas e saídas compatíveis | -   Entradas:                      |
    
    Texto, Código, Imagens, Áudio, Vídeo
    
-   Saídas:
    
    Texto|
|Limites de tokens|-   Máximo de tokens de entrada: 1.048.576
-   Máximo de tokens de saída: 65.535 (padrão)|
|Recursos|-   Sim
-   [Embasamento com a Pesquisa Google](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search?hl=pt-br)
-   [Execução de código](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/code-execution?hl=pt-br)
-   [Instruções do sistema](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/system-instruction-introduction?hl=pt-br)
-   [Saída estruturada](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output?hl=pt-br)
-   [Chamadas de função](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling?hl=pt-br)
-   [Contar tokens](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/get-token-count?hl=pt-br)
-   [Pensar](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking?hl=pt-br)
-   [Armazenamento em cache de contexto implícito](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview?hl=pt-br)
-   [Armazenamento em cache de contexto explícito](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview?hl=pt-br)
-   [Mecanismo RAG da Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/rag-engine/rag-overview?hl=pt-br)
-   [Conclusões de chat](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/migrate/openai/overview?hl=pt-br)
-   Sem suporte
-   [Ajuste](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/tune-models?hl=pt-br)
-   [API Gemini Live](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api?hl=pt-br)|
|Tipos de uso|-   Sim
-   [Capacidade de processamento provisionada](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput?hl=pt-br)
-   [Cota compartilhada dinâmica](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/dsq?hl=pt-br)
-   Sem suporte
-   [Cota fixa](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/quotas?hl=pt-br)
-   [Previsão em lote](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini?hl=pt-br)|
|Especificações técnicas|
|**Imagens**|-   Máximo de imagens por comando: 3.000
-   Tamanho máximo por arquivo para dados inline ou uploads diretos pelo console: 7 MB
-   Tamanho máximo de cada arquivo do Google Cloud Storage: 30 MB
-   Tipos MIME compatíveis:
    
    `image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif`|
|**Documentos**|-   Número máximo de arquivos por comando: 3.000
-   Número máximo de páginas por arquivo: 1.000
-   Tamanho máximo de arquivo para importações da API ou do Cloud Storage: 50 MB
-   Tamanho máximo por arquivo para uploads diretos pelo console: 7 MB
-   Tipos MIME compatíveis:
    
    `application/pdf`, `text/plain`|
|**Vídeo**|-   Duração máxima do vídeo (com áudio): Aproximadamente 45 minutos
-   Duração máxima do vídeo (sem áudio): aproximadamente 1 hora
-   Número máximo de vídeos por comando: 10
-   Tipos MIME aceitos:
    
    `video/x-flv`, `video/quicktime`, `video/mpeg`, `video/mpegs`, `video/mpg`, `video/mp4`, `video/webm`, `video/wmv`, `video/3gpp`|
|**Áudio**|-   Duração máxima do áudio por solicitação: Aproximadamente 8, 4 horas ou até 1 milhão de tokens
-   Número máximo de arquivos de áudio por comando: 1
-   Entendimento de fala para: Resumo, transcrição e tradução de áudio
-   Tipos MIME aceitos:
    
    `audio/x-aac`, `audio/flac`, `audio/mp3`, `audio/m4a`, `audio/mpeg`, `audio/mpga`, `audio/mp4`, `audio/ogg`, `audio/pcm`, `audio/wav`, `audio/webm`|
|**Padrões de parâmetros**|-   Temperatura: 0,0 a 2,0 (padrão 1,0)
-   topP: 0,0-1,0 (padrão 0,95)
-   topK: 64 (corrigido)
-   candidateCount: 1 a 8 (padrão: 1)|
|Regiões compatíveis|
|Disponibilidade do modelo
(Inclui cota compartilhada dinâmica e capacidade de transmissão provisionada)|-   Global
-   global|
|Consulte [Implantações e endpoints](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations?hl=pt-br) para mais informações.|
|Data do limite de conhecimento|Janeiro de 2025|
|Versões|-   `gemini-2.5-flash-preview-09-2025`
-   Estágio de lançamento: acesso antecipado
-   Data de lançamento: 25 de setembro de 2025|
|Controles de segurança|
|Consulte [Controles de segurança](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/security-controls?hl=pt-br) para mais informações.|
|Idiomas compatíveis|Consulte [Idiomas aceitos](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models?hl=pt-br#expandable-1).|
|Preços|Consulte a seção [Preços](https://docs.cloud.google.com/vertex-ai/generative-ai/pricing?hl=pt-br).|