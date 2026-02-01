# Ambiente de Teste - Relatórios Temáticos

Este diretório contém scripts e dados para testar a geração de relatórios temáticos antes de implementar no site.

## Estrutura

```
prompts/ambientedeteste/
├── README.md               # Este arquivo
├── aprendizados.md         # Registro de lições aprendidas
├── DOCUMENTACAO_TECNICA.md # Referência do workflow GINGA
├── scripts/
│   ├── extrair_palantir.py     # Extrai alertas do Supabase
│   ├── analisar_palantir.py    # Analisa e gera relatório
│   └── testar_extracao.sh      # Teste rápido via curl
├── dados/
│   ├── palantir_alertas.json   # Lista de alertas filtrados
│   ├── palantir_conteudo.json  # Conteúdo extraído
│   └── palantir_analise.json   # Resultados da análise
└── output/
    ├── palantir_relatorio.md   # Relatório final
    └── palantir_wordcloud.png  # Nuvem de palavras
```

## Pré-requisitos

### Variáveis de ambiente

```bash
export SUPABASE_URL="https://peoyosdnthdpnhejivqo.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua_chave_aqui"
export SUPABASE_ANON_KEY="sua_chave_anon_aqui"
```

### Dependências Python (opcionais)

```bash
pip install supabase wordcloud
```

## Uso Rápido

### 1. Testar extração de um alerta

```bash
cd scripts
chmod +x testar_extracao.sh
./testar_extracao.sh
# Copie um ID e execute:
./testar_extracao.sh <alert_id>
```

### 2. Extrair múltiplos alertas

```bash
# Modo teste (sem executar de verdade)
python extrair_palantir.py --limit 5 --dry-run

# Extrair 10 alertas
python extrair_palantir.py --limit 10
```

### 3. Gerar relatório

```bash
python analisar_palantir.py --wordcloud
```

## Status do Projeto

| Fase                      | Status         |
| ------------------------- | -------------- |
| Análise de infraestrutura | ✅ Concluída    |
| Preparação de dados       | 🔄 Em andamento |
| Extração de conteúdo      | ⏳ Pendente     |
| Análise NLP               | ⏳ Pendente     |
| Geração de relatório      | ⏳ Pendente     |

## Estatísticas Atuais

- **338 alertas** sobre Palantir encontrados
- **0 conteúdos** extraídos (pendente execução)
- Período: 28 Nov 2025 a 27 Jan 2026

## Próximos Passos

1. Configurar variáveis de ambiente
2. Executar extração de conteúdo piloto (10-20 alertas)
3. Validar qualidade da extração
4. Executar análise e gerar relatório
5. Documentar aprendizados
