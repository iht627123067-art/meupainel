# 🤖 Levantamento de Modelos Gemini Disponíveis

Este levantamento foi realizado via API `ListModels` em 07/01/2026, identificando os modelos ativos e suportados na conta do projeto para uso nas Edge Functions.

## 🚀 Modelos de Nova Geração (Vanguarda)
Estes modelos representam o estado da arte em velocidade e inteligência, sendo a preferência principal no nosso pipeline de classificação.

- **`gemini-2.0-flash`**: O modelo mais rápido e eficiente da série 2.0. Ideal para tarefas de classificação em tempo real.
- **`gemini-2.0-flash-exp`**: Versão experimental do 2.0 Flash, permitindo acesso antecipado a melhorias de raciocínio.
- **`gemini-2.0-flash-lite`** & **`gemini-2.0-flash-lite-001`**: Versões ultra-otimizadas para baixíssima latência e menor custo.
- **`gemini-2.5-flash`** & **`gemini-2.5-pro`**: Modelos avançados identificados na conta, preparados para tarefas de maior complexidade.

## ⚖️ Modelos de Produção (Estáveis)
Utilizados como fallback automático caso os modelos 2.0/2.5 apresentem instabilidade ou atinjam limites de cota.

- **`gemini-1.5-flash`**: O cavalo de batalha atual. Excelente equilíbrio entre custo e performance para extração de contexto longo.
- **`gemini-1.5-flash-latest`**: Sempre aponta para a versão estável mais recente do 1.5 Flash.
- **`gemini-pro`**: Modelo focado em tarefas complexas de lógica e criatividade.

## 🧠 Modelos Especializados
- **`gemini-exp-1206`**: Versão experimental focada em pesquisa e testes de capacidades avançadas.
- **`embedding-gecko-001`**: Especializado em geração de vetores (embeddings) para buscas semânticas (RAG).
- **`gemma-3-*` (1b, 4b, 12b, 27b)**: Modelos abertos (open-weights) da Google, ideais para tarefas menores ou instâncias locais.

## 🛠️ Implementação no Projeto
O sistema de classificação (`classify-content`) foi configurado com um **Algoritmo de Rotação de Modelos**:

```typescript
const models = [
  "gemini-2.0-flash",     // 🥇 Preferência
  "gemini-2.0-flash-exp", // 🥈 Backup I (Exp)
  "gemini-1.5-flash",     // 🥉 Backup II (Estabilidade)
  "gemini-pro"            // 🏅 Último Recurso
];
```

Essa abordagem garante que o projeto utilize sempre as melhores inteligências do Google, mas mantenha a robustez operacional se um modelo específico estiver fora do ar.

---
*Levantamento gerado automaticamente por Antigravity em 07/01/2026.*
