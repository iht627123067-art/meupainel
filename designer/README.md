# 🚀 Meu Painel - Inteligência de Conteúdo

Sistema automatizado para monitoramento, extração e classificação de notícias utilizando Inteligência Artificial.

## ✨ Funcionalidades Principais
- **Monitoramento RSS**: Captura automática de novas notícias de feeds e Google News.
- **Resolução de URLs Inteligente**: Tecnologia customizada para "quebrar" redirecionamentos opacos do Google News.
- **Extração com Jina Reader**: Conversão de qualquer site para Markdown limpo.
- **Classificação via Gemini 2.0 Flash**: Orquestração por IA para decidir destinos (LinkedIn vs Archive).
- **Pipeline Automatizado**: Processamento 100% via Triggers de banco de dados (PostgreSQL + pg_net).

## 📑 Documentação Técnica
- [Resolução de URLs do Google News](./DOC_TECNICO_GOOGLE_NEWS.md) - Detalhamento da técnica de extração.
- [Levantamento de Modelos Gemini](./LEVANTAMENTO_GEMINI_MODELS.md) - Inventário de modelos ativos na conta.
- [Status do Projeto](./PROJECT_STATUS.md) - Roadmap e tarefas concluídas.
- [Sprint Review](./SPRINT_REVIEW.md) - Histórico de melhorias aplicadas.

## 🛠️ Tecnologias
- **Frontend**: Vite + React + TailwindCSS
- **Backend**: Supabase (Edge Functions, PostgreSQL, Auth, DB Triggers)
- **IA**: Google Gemini 1.5/2.0
- **Extração**: Jina.ai Reader

---
*Desenvolvido com foco em alta performance e automação inteligente.*
