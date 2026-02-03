# Scripts de Monitoramento e Pesquisa

Este diretório contém scripts para gerenciar e pesquisar nos alertas monitorados.

## 🔎 pesquisar_tema.py

Este é o script principal para pesquisa sob demanda. Ele permite buscar alertas por palavras-chave, extrair conteúdo e gerar relatórios.

### Como usar

Certifique-se de ter as dependências instaladas:
```bash
pip install supabase
```

Defina a chave de serviço do Supabase (necessária para acesso completo):
```bash
export SUPABASE_SERVICE_ROLE_KEY="sua-chave-aqui"
```

Execute a pesquisa:
```bash
# Pesquisar e listar apenas
python3 pesquisar_tema.py "eleicoes inteligencia artificial"

# Pesquisar, extrair conteúdo (se faltar) e gerar relatório
python3 pesquisar_tema.py "eleicoes inteligencia artificial" --extract --analyze
```

O relatório será salvo em `../output/RELATORIO_NOMEDOTEMA.md`.
Os dados brutos (JSON) ficam em `../dados/`.

## Outros Scripts

- `fetch_data.py`: Script legado para buscar dados (hardcoded para Palantir).
- `extrair_palantir.py`: Script legado específico para Palantir.
- `analisar_palantir.py`: Script legado para análise do Palantir.
