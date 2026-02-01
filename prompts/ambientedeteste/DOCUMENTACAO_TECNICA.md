# Documentação Técnica: Elaboração do Memorial GINGA

Este documento detalha o workflow, as técnicas de ciência de dados, os prompts e os padrões de design utilizados para a criação do **Memorial Técnico de Análise de Compatibilidade GINGA**.

---

## 🛠️ Workflow de Trabalho

O processo foi estruturado em quatro fases principais:

1.  **Estruturação Paramétrica**: Definição dos conceitos fundamentais das 5 dimensões GINGA e mapeamento de palavras-chave/expressões de controle para cada uma.
2.  **Processamento e Extração (NLP)**: Decomposição da Minuta da Lei (Artigos 45-74) e análise individualizada via Metodologia Dual.
3.  **Consolidação de Dados**: Geração de base estruturada em CSV com métricas de aderência calculadas.
4.  **Apresentação de Alto Impacto**: Conversão dos achados técnicos em dois formatos complementares:
    -   **Relatório de Compatibilidade (Markdown)**: Focado em análise executiva, recomendações e pontos críticos.
    -   **Memorial Técnico (HTML)**: Documento formal para impressão e distribuição oficial.

---

## 🔬 Metodologia de Ciência de Dados (Dual Methodology)

A principal inovação técnica foi o uso de uma métrica dupla para evitar falsos positivos de alinhamento.

### 1. Aderência Conceitual
Mede o alinhamento de **ideias**, mesmo que usem palavras diferentes.
-   **Técnica**: Baseada em *Similaridade de Cosseno* (vetorização semântica).
-   **Logística**: O motor de IA analisa o "espírito" do artigo contra a definição teórica da dimensão GINGA.

### 2. Aderência Terminológica
Mede o uso do **vocabulário específico** do ecossistema GINGA.
-   **Técnica**: *Term Frequency (TF)* e análise de *N-gramas* (expressões compostas).
-   **Logística**: Contagem exata de termos como "segurança psicológica", "sandboxes", "lideranças vocacionadas".

### 3. Sistema de Bonificação
Para refinar os índices, aplicamos pesos matemáticos:
-   **Bônus por Keyword**: Cada termo-chave encontrado adiciona **4%** ao índice (limitado a 20%).
-   **Interpretação**: 
    -   Alta Conceitual + Baixa Terminológica = Oportunidade de Emenda de Redação.
    -   Alta Conceitual + Alta Terminológica = Artigo Pilar (Proteção Total).

---

## 📝 Engenharia de Prompts

Foram utilizados prompts estruturados para garantir consistência. O modelo principal encontra-se em `analiselgga/prompt.md`.

### Padrão de Análise de Dispositivos Legais
O prompt foi desenhado para atuar como um **Revisor Jurídico de Inovação**, utilizando a seguinte lógica:
-   **Contextualização Teórica**: Injeção do framework GINGA como critério de verdade.
-   **Extração Estruturada**: Comando para decompor textos de Word/PDF em linhas de CSV.
-   **Análise Multidimensional**: Atribuição de compatibilidade (S/N), identificação da dimensão predominante e levantamento de sugestões de melhoria.

---

## 📈 Relatório de Compatibilidade (Análise Executiva)

Diferente do Memorial, o `relatorio_compatibilidade_ginga.md` foca na síntese estratégica para tomada de decisão.

### Técnicas de Redação Técnica
-   **Markdown Avançado**: Uso de GitHub Alerts (`> [!IMPORTANT]`, `> [!TIP]`, `> [!CAUTION]`) para destacar riscos e oportunidades sem poluir a leitura principal.
-   **Mapeamento por Criticidade**: Identificação de "Artigos Críticos" (Art. 59, 63 e 66) que funcionam como os pilares do framework na lei.
-   **Links Dinâmicos**: Referenciamento direto para a fonte original (`.docx`) e para a base de dados (`.csv`), garantindo rastreabilidade total.

### Categorização de Lacunas
A técnica utilizada para as recomendações seguiu a lógica de **"Gap Analysis"**:
1.  **Fortalecimento Terminológico**: Onde o conceito existe mas o nome GINGA não.
2.  **Detalhamento de Incentivos**: Onde a lei é genérica e precisa de mecanismos específicos.
3.  **Explicitação de Conceitos**: Como o caso da "Segurança Psicológica", onde o termo foi sugerido para inserção textual.

---

## 🎨 Técnicas de Design e Bibliotecas Front-end

O `memorial.html` foi construído para ser um documento "Ready-to-Print" e visualmente "Wowed".

### Padrões Visuais (UI/UX)
-   **Tipografia**: Uso de fontes serifadas para o corpo do texto (`Crimson Pro`) para facilitar a leitura longa, e sans-serif (`Inter`) para dados e títulos (estilo profissional/jurídico).
-   **Cores**: Paleta sóbria baseada em `--primary-color: #1a365d` (Segurança/Institucional) e acentos em dourado/âmbar para as dimensões GINGA.
-   **Visualização de Dados**: Cards de estatísticas com sombras suaves (glassmorphism leve) e tabelas de distribuição com zebrado para leitura rápida.

### Bibliotecas e Recursos Externos
-   **Fontes**: Google Fonts API.
-   **CSS Custom Properties**: Sistema de tokens para fácil ajuste de tema.
-   **Media Queries `@media print`**: Configuração específica para que o documento mantenha a estética premium ao ser salvo em PDF ou impresso em A4 (margens de 2cm, quebras de página inteligentes, botões ocultos na impressão).

---

## 🏗️ ANEXO: Kit de Replicação Técnica
*Use este kit para criar novos memoriais de análise legislativa.*

### 1. Script de Análise Semântica (Python / Pseudo-código)
Este script implementa a lógica **Dual Methodology** descrita na seção 2.

```python
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

# 1. Definição das Dimensões GINGA (Base de Conhecimento)
DIMENSOES = {
    "GOVERNANCA": "coordenação estratégica clareza de papéis visão sistêmica fórum hub rede",
    "INCENTIVOS": "recursos materiais humanos simbólicos fomento gratificação prêmio",
    "NORMAS": "regulação adaptativa sandbox experimentação segurança jurídica risco",
    "CAPACIDADES": "competências treinamento mensuração evidências dados aprendizado",
    "AMBIENCIA": "segurança psicológica confiança erro honesto não punição colaboração"
}

# Palavras-chave para Bônus Terminológico (Peso Extra)
KEYWORDS = {
    "GOVERNANCA": ["sistêmica", "rede", "hub", "laboratório"],
    "INCENTIVOS": ["fomento", "gratificação", "prêmio"],
    "NORMAS": ["sandbox", "experimental", "adaptativa"],
    "CAPACIDADES": ["evidência", "dados", "aprendizado"],
    "AMBIENCIA": ["segurança psicológica", "confiança", "erro"]
}

def calcular_aderencia(texto_artigo):
    """
    Calcula aderência conceitual (cosseno) e terminológica (keywords).
    """
    resultados = {}
    
    for dim, texto_dim in DIMENSOES.items():
        # A. Aderência Conceitual (Cosseno)
        vectors = CountVectorizer().fit_transform([texto_artigo, texto_dim])
        cosine_sim = cosine_similarity(vectors)[0][1]
        
        # B. Aderência Terminológica (Bônus)
        bonus = 0
        for word in KEYWORDS[dim]:
            if word in texto_artigo.lower():
                bonus += 0.04  # 4% por palavra encontrada
        
        # Cálculo Final
        score_final = min((cosine_sim * 100) + (bonus * 100), 100)
        resultados[dim] = round(score_final, 2)
        
    return resultados

# Exemplo de Uso
# df = pd.read_csv("minuta_lei.csv")
# df['scores'] = df['texto_artigo'].apply(calcular_aderencia)
```

### 2. Prompt "Revisor Jurídico de Inovação" (Template)
Copie e cole este prompt em sua LLM para gerar a análise inicial.

````markdown
# ROLE
Atue como um Especialista em Direito Público e Inovação Governamental. Sua tarefa é analisar a compatibilidade de uma minuta de lei com o Framework GINGA.

# CONTEXTO (Framework GINGA)
1. GOVERNANÇA: Coordenação, redes, hubs.
2. INCENTIVOS: Prêmios, fundos, motivação.
3. NORMAS: Sandboxes, segurança jurídica para inovar.
4. CAPACIDADES: Treinamento, dados, evidências.
5. AMBIÊNCIA: Segurança psicológica, cultura de erro honesto.

# TAREFA
Analise o artigo fornecido abaixo.
1. Classifique a compatibilidade (ALTA, MÉDIA, BAIXA).
2. Identifique a dimensão predominante.
3. Destaque trechos que provam a compatibilidade.
4. Sugira UMA melhoria específica se a nota for BAIXA ou MÉDIA.

# INPUT
[COLAR TEXTO DO ARTIGO AQUI]

# OUTPUT (JSON)
{
  "artigo": "Número",
  "compatibilidade": "ALTA/MEDIA/BAIXA",
  "dimensao_principal": "NOME",
  "score_estimado": 0-100,
  "sugestao": "Texto da sugestão"
}
````

### 3. Template HTML "Premium Print" (Estrutura)
Use esta estrutura para garantir que o memorial seja visualmente impactante.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <!-- Fontes Premium -->
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600&family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #1a365d; /* Azul Institucional */
            --accent: #d69e2e;  /* Dourado Ouro */
        }
        
        /* Configuração de Impressão A4 */
        @media print {
            @page { margin: 2cm; size: A4; }
            body { font-size: 10pt; -webkit-print-color-adjust: exact; }
            .no-break { page-break-inside: avoid; }
            .page-break { page-break-after: always; }
        }

        /* Estilo de Cartões de Estatística */
        .stat-card {
            border: 1px solid var(--accent);
            border-radius: 8px;
            padding: 1em;
            background: rgba(214, 158, 46, 0.1); /* Dourado bem claro */
        }
        
        /* Tipografia */
        body { font-family: 'Crimson Pro', serif; line-height: 1.6; }
        h1, h2, h3 { font-family: 'Inter', sans-serif; color: var(--primary); }
    </style>
</head>
<body>
    <div class="stat-card">
        <h3>Estatística Principal</h3>
        <h1>87%</h1>
        <p>de Compatibilidade</p>
    </div>
</body>
</html>
```

### 4. Sequência de Execução Detalhada (Passo a Passo)

---

#### ✅ PASSO 1: Extração do Texto da Minuta
**Objetivo:** Converter o documento Word/PDF em texto puro editável.

**Ferramenta Usada:** Cópia manual do texto ou uso de bibliotecas como `python-docx`.

**Script Python para Extração de .docx:**
```python
from docx import Document

def extrair_texto_docx(caminho_arquivo):
    """
    Extrai texto puro de um arquivo .docx.
    Retorna uma string com todo o conteúdo.
    """
    doc = Document(caminho_arquivo)
    texto_completo = []
    for paragrafo in doc.paragraphs:
        texto_completo.append(paragrafo.text)
    return '\n'.join(texto_completo)

# Uso:
texto = extrair_texto_docx("MINUTA NOVA LEI GERAL GESTAO PUBLICA.docx")
with open("minuta_texto_puro.txt", "w", encoding="utf-8") as f:
    f.write(texto)
```

**Erros Comuns e Soluções:**
| Erro                        | Causa                      | Solução                                              |
| --------------------------- | -------------------------- | ---------------------------------------------------- |
| `PackageNotFoundError`      | Arquivo não é .docx válido | Converter PDF para DOCX antes                        |
| Texto com quebras estranhas | Tabelas no Word            | Usar `doc.tables` para extrair tabelas separadamente |

---

#### ✅ PASSO 2: Segmentação por Artigo
**Objetivo:** Separar o texto em linhas, cada uma contendo um artigo completo.

**Regex Utilizado:** `^Art\.\s*\d+`

**Script Python para Segmentação:**
```python
import re

def segmentar_artigos(texto_puro):
    """
    Divide o texto em artigos usando regex.
    Retorna lista de dicionários com número e texto.
    """
    # Padrão: "Art. 45. " ou "Art. 45 -"
    padrao = r'(Art\.\s*\d+[\.\s\-]+)'
    partes = re.split(padrao, texto_puro)
    
    artigos = []
    for i in range(1, len(partes), 2):
        numero_match = re.search(r'\d+', partes[i])
        if numero_match and i+1 < len(partes):
            artigos.append({
                "numero": int(numero_match.group()),
                "texto": partes[i] + partes[i+1].strip()
            })
    return artigos

# Uso:
with open("minuta_texto_puro.txt", "r", encoding="utf-8") as f:
    texto = f.read()

artigos = segmentar_artigos(texto)
print(f"Total de artigos extraídos: {len(artigos)}")

# Salvar como JSON intermediário
import json
with open("artigos_segmentados.json", "w", encoding="utf-8") as f:
    json.dump(artigos, f, ensure_ascii=False, indent=2)
```

**Erros Comuns e Soluções:**
| Erro                                   | Causa                                         | Solução                              |
| -------------------------------------- | --------------------------------------------- | ------------------------------------ |
| Artigos faltando                       | Formatação inconsistente ("Art 45" sem ponto) | Ajustar regex: `Art\.?\s*\d+`        |
| Parágrafos/Incisos separados do artigo | Quebras de linha no Word                      | Juntar parágrafos antes de segmentar |

---

#### ✅ PASSO 3: Análise via LLM (Prompt Completo)
**Objetivo:** Classificar cada artigo quanto à compatibilidade GINGA.

**Prompt Completo Utilizado (copiar na íntegra):**
````markdown
# CONTEXTO
Você é um Especialista em Direito Público e Inovação Governamental.
Analise o artigo de lei abaixo verificando sua compatibilidade com o Framework GINGA.

# FRAMEWORK GINGA (5 Dimensões)

## 1. GOVERNANÇA
Coordenação estratégica, clareza de papéis e visão sistêmica.
Instâncias: Fórum Interministerial, Laboratórios, Hubs, Redes.
Palavras-chave: coordenação, integração, colaboração, sistêmica, articulação.

## 2. INCENTIVOS
Recursos materiais, humanos, organizacionais e simbólicos para inovar.
Instrumentos: Fundos de fomento, gratificações, subvenção, prêmios, nudges.
Palavras-chave: fomento, reconhecimento, apoio, motivação.

## 3. NORMAS
Regulação adaptativa que protege a experimentação.
Instrumentos: Sandboxes, marcos conceituais, guias.
Palavras-chave: sandbox, experimentação, previsibilidade, adaptativa.

## 4. GESTÃO DE CAPACIDADES
Mensuração e desenvolvimento contínuo de competências.
Instrumentos: Índice de Inovação, avaliação, desenvolvimento.
Palavras-chave: competência, evidência, aprendizado, mensuração.

## 5. AMBIÊNCIA
Segurança psicológica e ruptura com comando e controle.
Instrumentos: Mentorias, práticas de confiança.
Palavras-chave: segurança psicológica, confiança, bem-estar, cidadão.

# TAREFA
1. Leia o artigo fornecido.
2. Classifique: COMPATÍVEL ou NÃO COMPATÍVEL com GINGA.
3. Se compatível, identifique a(s) dimensão(ões) predominante(s).
4. Estime um score de aderência conceitual (0-100%).
5. Liste as expressões GINGA encontradas no texto.
6. Sugira UMA melhoria se o score for < 70%.

# INPUT
[COLAR TEXTO DO ARTIGO AQUI]

# OUTPUT (formato JSON estrito)
{
  "artigo": "Número do Artigo",
  "capitulo": "Nome do Capítulo",
  "ideia_geral": "Resumo em 1 frase",
  "compativel": true/false,
  "dimensao_principal": "NOME ou N/A",
  "dimensoes_secundarias": ["NOME", "NOME"],
  "score_conceitual": 0-100,
  "expressoes_ginga": ["termo1", "termo2"],
  "justificativa": "Explicação breve",
  "sugestao_melhoria": "Texto ou null"
}
````

**Exemplo de Resposta Esperada:**
```json
{
  "artigo": "59",
  "capitulo": "Inovação Pública",
  "ideia_geral": "Incentivar cultura de inovação por meio de reconhecimento e capacitação",
  "compativel": true,
  "dimensao_principal": "INCENTIVOS",
  "dimensoes_secundarias": ["AMBIÊNCIA", "GOVERNANÇA"],
  "score_conceitual": 76,
  "expressoes_ginga": ["cultura de inovação", "reconhecimento", "recursos específicos"],
  "justificativa": "O artigo aborda diretamente incentivos materiais e simbólicos para inovação.",
  "sugestao_melhoria": null
}
```

**Erros Comuns e Soluções:**
| Erro              | Causa                           | Solução                                                                                    |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| JSON inválido     | LLM adiciona texto antes/depois | Usar regex para extrair apenas o bloco `{...}`                                             |
| Score sempre alto | LLM otimista                    | Incluir no prompt: "Seja crítico, apenas artigos com 3+ termos GINGA devem ter score > 70" |
| Dimensão errada   | Confusão entre conceitos        | Adicionar exemplos concretos no prompt                                                     |

---

#### ✅ PASSO 4: Refinamento com Script de TF/Cosseno
**Objetivo:** Calcular scores precisos de forma determinística.

**Script Python Completo com Tratamento de Erros:**
```python
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import json
import re

# ========== CONFIGURAÇÃO ==========
DIMENSOES = {
    "GOVERNANÇA": """
        coordenação estratégica clareza papéis visão sistêmica 
        fórum interministerial hub laboratório rede articulação
        integração colaboração arranjo organizacional
    """,
    "INCENTIVOS": """
        recursos materiais humanos simbólicos fomento gratificação
        prêmio reconhecimento subvenção apoio motivação incentivo
        fundo financeiro orçamento
    """,
    "NORMAS": """
        regulação adaptativa sandbox experimentação segurança jurídica
        marco conceitual previsibilidade proteção risco teste piloto
        ambiente experimental
    """,
    "GESTÃO DE CAPACIDADES": """
        competência treinamento mensuração evidência dados aprendizado
        avaliação índice inovação desenvolvimento capacidade institucional
        desempenho resultado
    """,
    "AMBIÊNCIA": """
        segurança psicológica confiança erro honesto colaboração
        bem-estar cidadão pessoas ambiente trabalho cultura
        não punição proteção agente público
    """
}

KEYWORDS = {
    "GOVERNANÇA": ["sistêmica", "rede", "hub", "laboratório", "coordenação integrada"],
    "INCENTIVOS": ["fomento", "gratificação", "prêmio", "recursos específicos"],
    "NORMAS": ["sandbox", "experimental", "adaptativa", "marco conceitual"],
    "GESTÃO DE CAPACIDADES": ["evidência", "dados", "aprendizado", "índice"],
    "AMBIÊNCIA": ["segurança psicológica", "confiança", "boa-fé"]
}

N_GRAMAS = {
    "GOVERNANÇA": ["coordenação integrada", "redes colaborativas", "sistemas estruturantes"],
    "INCENTIVOS": ["cultura de inovação", "recursos específicos", "reconhecimento e valorização"],
    "NORMAS": ["ambientes experimentais", "inovação pública", "processos inovativos"],
    "GESTÃO DE CAPACIDADES": ["capacidades estatais", "avaliação de desempenho", "gestão por competências"],
    "AMBIÊNCIA": ["segurança psicológica", "experiência das pessoas", "metodologias adequadas"]
}

def limpar_texto(texto):
    """Remove caracteres especiais e normaliza espaços."""
    texto = texto.lower()
    texto = re.sub(r'[^\w\sáéíóúâêôãõç]', ' ', texto)
    texto = re.sub(r'\s+', ' ', texto)
    return texto.strip()

def calcular_aderencia_conceitual(texto_artigo, texto_dimensao):
    """Calcula similaridade de cosseno entre artigo e dimensão."""
    try:
        vectorizer = CountVectorizer()
        vectors = vectorizer.fit_transform([texto_artigo, texto_dimensao])
        similarity = cosine_similarity(vectors[0], vectors[1])[0][0]
        return similarity
    except Exception as e:
        print(f"Erro no cálculo de cosseno: {e}")
        return 0.0

def calcular_bonus_keywords(texto_artigo, dimensao):
    """Calcula bônus por palavras-chave encontradas."""
    texto_lower = texto_artigo.lower()
    palavras = KEYWORDS.get(dimensao, [])
    encontradas = [p for p in palavras if p in texto_lower]
    bonus = min(len(encontradas) * 0.04, 0.20)
    return bonus, encontradas

def calcular_bonus_ngramas(texto_artigo, dimensao):
    """Calcula bônus por expressões compostas (n-gramas)."""
    texto_lower = texto_artigo.lower()
    ngramas = N_GRAMAS.get(dimensao, [])
    encontrados = [n for n in ngramas if n in texto_lower]
    bonus = min(len(encontrados) * 0.05, 0.30)
    return bonus, encontrados

def analisar_artigo(texto_artigo):
    """
    Analisa um artigo contra todas as dimensões GINGA.
    Retorna a dimensão mais aderente e os scores.
    """
    texto_limpo = limpar_texto(texto_artigo)
    resultados = {}
    
    for dim, texto_dim in DIMENSOES.items():
        texto_dim_limpo = limpar_texto(texto_dim)
        
        # Similaridade base
        sim_base = calcular_aderencia_conceitual(texto_limpo, texto_dim_limpo)
        
        # Bônus
        bonus_kw, kw_encontradas = calcular_bonus_keywords(texto_artigo, dim)
        bonus_ng, ng_encontrados = calcular_bonus_ngramas(texto_artigo, dim)
        
        # Score Conceitual: (sim_base + bonus_kw) * 100
        score_conceitual = min((sim_base + bonus_kw) * 100, 100)
        
        # Score Terminológico: (sim_base*0.5 + bonus_ng + bonus_kw*0.5) * 100
        score_terminologico = min((sim_base * 0.5 + bonus_ng + bonus_kw * 0.5) * 100, 100)
        
        resultados[dim] = {
            "score_conceitual": round(score_conceitual, 1),
            "score_terminologico": round(score_terminologico, 1),
            "keywords": kw_encontradas,
            "ngramas": ng_encontrados
        }
    
    # Encontrar dimensão principal (maior score conceitual)
    dim_principal = max(resultados, key=lambda d: resultados[d]["score_conceitual"])
    
    return {
        "dimensao_principal": dim_principal,
        "score_conceitual": resultados[dim_principal]["score_conceitual"],
        "score_terminologico": resultados[dim_principal]["score_terminologico"],
        "expressoes_encontradas": (
            resultados[dim_principal]["keywords"] + 
            resultados[dim_principal]["ngramas"]
        ),
        "todos_scores": resultados
    }

# ========== EXECUÇÃO PRINCIPAL ==========
if __name__ == "__main__":
    # Carregar artigos do passo anterior
    with open("artigos_segmentados.json", "r", encoding="utf-8") as f:
        artigos = json.load(f)
    
    # Analisar cada artigo
    resultados_finais = []
    for art in artigos:
        print(f"Analisando Art. {art['numero']}...")
        analise = analisar_artigo(art["texto"])
        resultados_finais.append({
            "artigo": art["numero"],
            "texto": art["texto"][:200] + "...",  # Truncar para visualização
            **analise
        })
    
    # Salvar resultados
    with open("resultados_analise_precisos.json", "w", encoding="utf-8") as f:
        json.dump(resultados_finais, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Análise concluída! {len(resultados_finais)} artigos processados.")
```

**Erros Comuns e Soluções:**
| Erro                           | Causa                    | Solução                                         |
| ------------------------------ | ------------------------ | ----------------------------------------------- |
| `ValueError: empty vocabulary` | Artigo muito curto       | Adicionar check: `if len(texto) < 50: return 0` |
| Scores todos iguais            | Texto não foi limpo      | Verificar função `limpar_texto()`               |
| Import error sklearn           | Biblioteca não instalada | `pip install scikit-learn`                      |

---

#### ✅ PASSO 5: Consolidação em CSV Mestre
**Objetivo:** Unir resultados da LLM + Script em formato tabular.

**Colunas Finais do CSV (conforme `ANALISE_GINGA_IMPRESSAO.csv`):**
```
Capítulo, Art, Inteiro Teor do Artigo, Ideia Geral, Comp., Dimensão GINGA, % Conc., % Term., Justificativa, Comentários
```

**Script de Consolidação:**
```python
import pandas as pd
import json

# Carregar resultados do script (Passo 4)
with open("resultados_analise_precisos.json", "r", encoding="utf-8") as f:
    resultados_script = json.load(f)

# Carregar resultados da LLM (Passo 3) - opcional para enriquecer
# with open("resultados_llm.json", "r", encoding="utf-8") as f:
#     resultados_llm = json.load(f)

# Criar DataFrame
dados = []
for r in resultados_script:
    # Classificar nível de aderência
    score_c = r["score_conceitual"]
    score_t = r["score_terminologico"]
    
    if score_c >= 70:
        nivel_c = "🟢 ALTA"
    elif score_c >= 50:
        nivel_c = "🟡 MÉDIA"
    else:
        nivel_c = "🟠 BAIXA"
    
    if score_t >= 50:
        nivel_t = "🟢 ALTA"
    elif score_t >= 30:
        nivel_t = "🟡 MÉDIA"
    else:
        nivel_t = "🟠 BAIXA"
    
    # Montar justificativa
    expressoes = ", ".join(r["expressoes_encontradas"]) if r["expressoes_encontradas"] else "Nenhuma"
    justificativa = f"Conceitual: {nivel_c} ({score_c}%) | Terminológica: {nivel_t} ({score_t}%)"
    if expressoes != "Nenhuma":
        justificativa += f" | Expressões GINGA: '{expressoes}'"
    
    dados.append({
        "Capítulo": "",  # Preencher manualmente ou com mapeamento
        "Art": r["artigo"],
        "Inteiro Teor do Artigo": r["texto"],
        "Ideia Geral": "",  # Usar resultado da LLM
        "Comp.": "SIM" if score_c >= 40 else "NÃO",
        "Dimensão GINGA": r["dimensao_principal"] if score_c >= 40 else "N/A",
        "% Conc.": f"{score_c}%",
        "% Term.": f"{score_t}%",
        "Justificativa": justificativa,
        "Comentários": ""
    })

# Criar e salvar CSV
df = pd.DataFrame(dados)
df.to_csv("ANALISE_GINGA_FINAL.csv", index=False, encoding="utf-8-sig")
print("✅ CSV gerado: ANALISE_GINGA_FINAL.csv")
```

---

#### ✅ PASSO 6: Criação do Agente de IA para Redação
**Objetivo:** Configurar um agente de IA especializado para gerar relatórios e memoriais automaticamente.

> [!NOTE]
> A partir deste passo, **não usamos scripts Python**. O trabalho é executado por um agente de IA configurado com prompts específicos.

---

### 6.1. Arquitetura do Agente "Memorial GINGA"

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTE "MEMORIAL GINGA"                      │
├─────────────────────────────────────────────────────────────────┤
│  ENTRADA                                                         │
│  ├── CSV com análise dos artigos (PASSO 5)                      │
│  ├── Framework GINGA (5 dimensões)                              │
│  └── Template de saída (MD ou HTML)                             │
├─────────────────────────────────────────────────────────────────┤
│  FERRAMENTAS DO AGENTE                                          │
│  ├── view_file       → Ler arquivos de entrada                  │
│  ├── write_to_file   → Criar arquivos de saída                  │
│  ├── replace_file_content → Editar seções específicas           │
│  └── grep_search     → Buscar padrões nos dados                 │
├─────────────────────────────────────────────────────────────────┤
│  SAÍDA                                                           │
│  ├── relatorio_compatibilidade.md (Análise Executiva)           │
│  └── memorial.html (Documento Formal para Impressão)            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.2. System Prompt do Agente (Copiar na Íntegra)

````markdown
# IDENTIDADE
Você é o **Agente Memorial GINGA**, um especialista em análise legislativa e inovação governamental.
Sua função é transformar dados de análise de compatibilidade em documentos executivos de alta qualidade.

# CONTEXTO
O Framework GINGA possui 5 dimensões:
1. **GOVERNANÇA** - Coordenação estratégica, hubs, redes
2. **INCENTIVOS** - Fundos, prêmios, recursos para inovação
3. **NORMAS** - Sandboxes, regulação adaptativa
4. **GESTÃO DE CAPACIDADES** - Treinamento, evidências, índices
5. **AMBIÊNCIA** - Segurança psicológica, confiança

# SUAS CAPACIDADES
- Ler arquivos CSV com análises de artigos
- Gerar relatórios em Markdown com alertas GitHub
- Criar memoriais HTML otimizados para impressão A4
- Identificar gaps e propor recomendações estratégicas

# REGRAS DE FORMATAÇÃO

## Para Markdown:
- Use tabelas para estatísticas
- Use `> [!IMPORTANT]`, `> [!TIP]`, `> [!CAUTION]` para alertas
- Use emojis: ✅ ⚠️ ❌ 🔴 🟡 🟢 📊 🎯 💡
- Crie links para arquivos fonte: `[Art. XX](file:///caminho)`

## Para HTML:
- Use Google Fonts: Crimson Pro (corpo) e Inter (títulos)
- Use CSS Custom Properties para cores
- Inclua `@media print` para impressão perfeita
- Adicione botão "Imprimir" que some na impressão

# WORKFLOW DE EXECUÇÃO
1. LEIA o arquivo CSV de entrada
2. CALCULE estatísticas gerais (total, compatíveis, %)
3. AGRUPE artigos por dimensão GINGA
4. IDENTIFIQUE artigos críticos (score ≥ 70%)
5. IDENTIFIQUE lacunas (score < 50%)
6. ESCREVA recomendações estratégicas
7. GERE o arquivo de saída no formato solicitado
````

---

### 6.3. Prompts de Execução do Agente

#### Prompt para Gerar Relatório Markdown:
```
Leia o arquivo CSV em: [CAMINHO_DO_CSV]

Gere um relatório de compatibilidade GINGA em Markdown seguindo esta estrutura:

1. ESTATÍSTICAS GERAIS
   - Total de artigos analisados
   - Quantidade e % de compatíveis/não compatíveis

2. COMPATIBILIDADE POR DIMENSÃO
   - Para cada dimensão, liste os artigos principais
   - Use alertas [!IMPORTANT] para oportunidades de melhoria

3. ARTIGOS CRÍTICOS
   - Liste artigos com score ≥ 70%
   - Explique por que são críticos para GINGA

4. ARTIGOS NÃO COMPATÍVEIS
   - Tabela com artigo, tema e razão

5. RECOMENDAÇÕES ESTRATÉGICAS
   - Priorize por ALTA/MÉDIA/BAIXA
   - Seja específico nas ações

6. CONCLUSÃO
   - Pontos fortes (✅)
   - Lacunas (⚠️)
   - Próximos passos numerados

Salve em: [CAMINHO_DE_SAÍDA]/relatorio_compatibilidade_ginga.md
```

#### Prompt para Gerar Memorial HTML:
```
Leia o arquivo CSV em: [CAMINHO_DO_CSV]

Gere um Memorial Técnico em HTML seguindo estas especificações:

DESIGN:
- Fontes: Crimson Pro (corpo), Inter (títulos)
- Cores: Azul institucional (#1a365d), Dourado (#d69e2e)
- Layout: Máximo 21cm (A4), padding 2cm

ESTRUTURA:
1. HEADER
   - Título "Memorial Técnico"
   - Subtítulo com nome da lei
   - Metadados (data, finalidade, documentos)

2. CONTEXTUALIZAÇÃO
   - Objeto da análise
   - Sobre a minuta
   - Framework GINGA (5 dimensões)

3. METODOLOGIA
   - Abordagem dual (conceitual + terminológica)
   - Técnicas usadas (TF, Cosseno, N-gramas)

4. RESULTADOS
   - Cards de estatísticas (stats-grid)
   - Tabelas de distribuição
   - Seção de interpretação

5. DESTAQUES NORMATIVOS
   - Artigos com dimension-tag
   - Relevância de cada um

6. RECOMENDAÇÕES
   - Highlight-boxes com warnings

7. FOOTER
   - Data e créditos

IMPRESSÃO:
- @page { size: A4; margin: 2cm 2.5cm; }
- .no-break { page-break-inside: avoid; }
- .print-hide para botão de imprimir

Salve em: [CAMINHO_DE_SAÍDA]/memorial.html
```

---

### 6.4. Técnicas de IA Utilizadas pelo Agente

| Técnica                | Descrição                                    | Uso no Agente                                   |
| ---------------------- | -------------------------------------------- | ----------------------------------------------- |
| **Prompt Engineering** | Instruções estruturadas para guiar a geração | System prompt e prompts de execução             |
| **Few-Shot Learning**  | Exemplos de saída esperada                   | Templates MD e HTML no contexto                 |
| **Chain of Thought**   | Raciocínio passo a passo                     | "Primeiro leia, depois calcule, depois escreva" |
| **Tool Use**           | Chamada de ferramentas externas              | view_file, write_to_file, grep_search           |
| **Structured Output**  | Saída em formato específico                  | JSON para intermediários, MD/HTML para finais   |

---

### 6.5. Implementação com Frameworks de Agentes

#### Opção A: Usando LangChain (Python)
```python
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI
from langchain.tools import FileManagementToolkit

# Ferramentas do agente
tools = FileManagementToolkit(
    root_dir="./analiselgga",
    allowed_tools=["read_file", "write_file", "list_directory"]
).get_tools()

# Inicializar agente
agent = initialize_agent(
    tools=tools,
    llm=OpenAI(model="gpt-4", temperature=0.3),
    agent="zero-shot-react-description",
    verbose=True
)

# Executar tarefa
agent.run("""
Leia o arquivo ANALISE_GINGA_FINAL.csv e gere um relatório 
de compatibilidade GINGA em Markdown.
""")
```

#### Opção B: Usando CrewAI (Agentes Colaborativos)
```python
from crewai import Agent, Task, Crew

# Agente Analista
analista = Agent(
    role="Analista de Compatibilidade GINGA",
    goal="Analisar dados do CSV e identificar padrões",
    backstory="Especialista em inovação governamental"
)

# Agente Redator
redator = Agent(
    role="Redator de Memoriais Técnicos",
    goal="Transformar análises em documentos executivos",
    backstory="Especialista em redação técnica e legal"
)

# Tarefas
tarefa_analise = Task(
    description="Leia o CSV e identifique artigos críticos",
    agent=analista
)

tarefa_relatorio = Task(
    description="Gere o relatório MD com base na análise",
    agent=redator
)

# Crew
crew = Crew(
    agents=[analista, redator],
    tasks=[tarefa_analise, tarefa_relatorio]
)

resultado = crew.kickoff()
```

#### Opção C: Usando Antigravity/Gemini Diretamente
```
# Workflow .agent/workflows/memorial-ginga.md

---
description: Gerar Memorial de Compatibilidade GINGA
---

1. Ler o CSV de análise
// turbo
2. Calcular estatísticas gerais
// turbo
3. Identificar artigos críticos (score >= 70%)
// turbo
4. Identificar lacunas (score < 50%)
// turbo
5. Gerar relatório Markdown
6. Gerar memorial HTML
7. Notificar usuário para revisão
```

---

### 6.6. Erros Comuns e Soluções do Agente

| Erro                         | Causa                        | Solução                                |
| ---------------------------- | ---------------------------- | -------------------------------------- |
| Agente não encontra arquivo  | Caminho relativo vs absoluto | Sempre usar caminhos absolutos         |
| HTML com formatação quebrada | Aspas não escapadas          | Usar template literals ou heredoc      |
| Relatório muito genérico     | Prompt vago                  | Adicionar exemplos concretos no prompt |
| Estatísticas erradas         | CSV com encoding diferente   | Especificar `encoding="utf-8-sig"`     |
| Agente para no meio          | Contexto muito longo         | Dividir em sub-tarefas menores         |

---

### 6.7. Decomposição em Sub-Tarefas (Chain of Tasks)

O agente executa internamente uma sequência de sub-tarefas. Abaixo está o detalhamento de cada uma:

```
TAREFA PRINCIPAL: Gerar Memorial GINGA
│
├── SUB-TAREFA 1: Leitura e Parsing do CSV
│   ├── Tool: view_file("ANALISE_GINGA_IMPRESSAO.csv")
│   ├── Ação: Identificar colunas (Art, Comp., Dimensão, % Conc., % Term.)
│   └── Output: Estrutura de dados em memória
│
├── SUB-TAREFA 2: Cálculo de Estatísticas
│   ├── Ação: Contar artigos por status (SIM/NÃO)
│   ├── Ação: Calcular percentuais
│   └── Output: { total: 30, compatíveis: 26, taxa: 86.7% }
│
├── SUB-TAREFA 3: Agrupamento por Dimensão
│   ├── Ação: Criar buckets para cada dimensão GINGA
│   ├── Ação: Classificar artigos em suas dimensões
│   └── Output: { GOVERNANÇA: [45,46,60,71], INCENTIVOS: [59,67,73], ... }
│
├── SUB-TAREFA 4: Identificação de Críticos e Lacunas
│   ├── Ação: Filtrar artigos com % Conc. >= 70% → Críticos
│   ├── Ação: Filtrar artigos com % Conc. < 50% → Lacunas
│   └── Output: { críticos: [59,63,66], lacunas: [53,54,55] }
│
├── SUB-TAREFA 5: Geração de Recomendações
│   ├── Ação: Para cada lacuna, propor ação específica
│   ├── Ação: Priorizar por impacto (ALTA/MÉDIA/BAIXA)
│   └── Output: Lista de recomendações estruturadas
│
└── SUB-TAREFA 6: Escrita do Documento Final
    ├── Tool: write_to_file("relatorio.md", conteúdo)
    └── Output: Arquivo gerado no disco
```

---

### 6.8. Exemplos de Tool Calls do Agente

#### 6.8.1. Leitura do CSV de Entrada
```python
# Pseudo-código da chamada interna do agente
tool_call = {
    "name": "view_file",
    "parameters": {
        "AbsolutePath": "/Users/thiagobvilar/Documents/ginga/analiselgga/ANALISE_GINGA_IMPRESSAO.csv"
    }
}

# Resultado esperado:
# Capítulo,Art,Inteiro Teor do Artigo,Ideia Geral,Comp.,Dimensão GINGA,% Conc.,% Term.,...
# COORDENAÇÃO E GESTÃO INTEGRADA,45,"Art. 45...",Promover integração...,SIM,GOVERNANÇA,57.0%,30.5%,...
```

#### 6.8.2. Busca por Padrões Específicos
```python
# Buscar todos os artigos com "sandbox"
tool_call = {
    "name": "grep_search",
    "parameters": {
        "SearchPath": "/Users/thiagobvilar/Documents/ginga/analiselgga/",
        "Query": "sandbox",
        "CaseInsensitive": True
    }
}

# Resultado esperado:
# ANALISE_GINGA_IMPRESSAO.csv:Art. 63:sandbox regulatório
```

#### 6.8.3. Escrita do Arquivo de Saída
```python
# Criar o relatório Markdown
tool_call = {
    "name": "write_to_file",
    "parameters": {
        "TargetFile": "/Users/thiagobvilar/Documents/ginga/analiselgga/relatorio_compatibilidade_ginga.md",
        "CodeContent": "# Análise de Compatibilidade GINGA\n\n## Estatísticas Gerais\n...",
        "Overwrite": True
    }
}
```

---

### 6.9. Gestão de Memória e Contexto do Agente

O agente precisa manter informações entre as sub-tarefas. Abaixo está a estrutura de memória recomendada:

```python
# Estado interno do agente (memória de trabalho)
agent_memory = {
    # Dados brutos do CSV
    "raw_data": [
        {"art": 45, "comp": "SIM", "dim": "GOVERNANÇA", "conc": 57.0, "term": 30.5},
        {"art": 46, "comp": "SIM", "dim": "GOVERNANÇA", "conc": 51.6, "term": 43.3},
        # ... demais artigos
    ],
    
    # Estatísticas calculadas
    "stats": {
        "total": 30,
        "compatíveis": 26,
        "não_compatíveis": 4,
        "taxa_compatibilidade": 86.7,
        "média_conceitual": 52.3,
        "média_terminológica": 28.7
    },
    
    # Agrupamento por dimensão
    "por_dimensao": {
        "GOVERNANÇA": {"artigos": [45, 46, 60, 71], "count": 4},
        "INCENTIVOS": {"artigos": [59, 67, 73], "count": 3},
        "NORMAS": {"artigos": [56, 57, 58, 63, 66], "count": 5},
        "GESTÃO DE CAPACIDADES": {"artigos": [48, 49, 50, 51, 69, 70, 71, 72], "count": 8},
        "AMBIÊNCIA": {"artigos": [52, 57, 66], "count": 3}
    },
    
    # Classificações
    "críticos": [
        {"art": 59, "razão": "Define incentivos à cultura de inovação"},
        {"art": 63, "razão": "Cria sandboxes regulatórios"},
        {"art": 66, "razão": "Proteção por boa-fé em inovação"}
    ],
    
    "lacunas": [
        {"art": 53, "razão": "Foco técnico sem conexão com inovação"},
        {"art": 54, "razão": "Gestão administrativa tradicional"},
        {"art": 55, "razão": "Não conecta com dinâmicas GINGA"}
    ],
    
    # Progresso da tarefa
    "progress": {
        "csv_lido": True,
        "stats_calculadas": True,
        "agrupamento_feito": True,
        "críticos_identificados": True,
        "lacunas_identificadas": True,
        "recomendações_geradas": False,
        "arquivo_escrito": False
    }
}
```

---

### 6.10. Métricas de Avaliação do Agente

Para garantir qualidade, avalie o agente com estas métricas:

| Métrica                         | Descrição                            | Meta    | Como Medir                    |
| ------------------------------- | ------------------------------------ | ------- | ----------------------------- |
| **Precisão Estatística**        | Estatísticas calculadas corretamente | 100%    | Comparar com cálculo manual   |
| **Cobertura de Artigos**        | Todos os artigos foram processados   | 100%    | Contar linhas no relatório    |
| **Qualidade das Recomendações** | Recomendações são acionáveis         | ≥ 4/5   | Avaliação humana              |
| **Aderência ao Template**       | Segue estrutura definida             | 100%    | Verificar seções obrigatórias |
| **Tempo de Execução**           | Rapidez na geração                   | < 2 min | Cronômetro                    |
| **Consistência**                | Mesmo input = mesmo output           | 100%    | Rodar 3 vezes e comparar      |

#### Script de Validação Automática:
```python
import json
import re

def validar_relatorio(caminho_md):
    """
    Valida se o relatório gerado atende aos critérios mínimos.
    """
    with open(caminho_md, "r", encoding="utf-8") as f:
        conteudo = f.read()
    
    criterios = {
        "titulo_presente": "# Análise de Compatibilidade GINGA" in conteudo,
        "estatisticas_presentes": "📊 Estatísticas Gerais" in conteudo,
        "tabela_estatisticas": "| Métrica" in conteudo,
        "dimensoes_listadas": all(d in conteudo for d in ["Governança", "Incentivos", "Normas"]),
        "artigos_criticos": "⭐ Artigos CRÍTICOS" in conteudo or "🔴 Art." in conteudo,
        "recomendacoes": "💡 Recomendações" in conteudo,
        "alertas_github": "[!IMPORTANT]" in conteudo or "[!TIP]" in conteudo,
        "links_arquivos": "file:///" in conteudo
    }
    
    score = sum(criterios.values()) / len(criterios) * 100
    
    print("=== VALIDAÇÃO DO RELATÓRIO ===")
    for criterio, passou in criterios.items():
        print(f"{'✅' if passou else '❌'} {criterio}")
    print(f"\nScore: {score:.1f}%")
    
    return score >= 80  # Passa se atingir 80%

# Uso:
validar_relatorio("relatorio_compatibilidade_ginga.md")
```

---

### 6.11. Debugging do Agente

#### Logs de Execução Detalhados
```python
import logging

# Configurar logging detalhado
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler("agent_debug.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("MemorialGINGA")

# Exemplo de logs durante execução:
# 2026-01-28 14:30:01 | INFO | Iniciando sub-tarefa: Leitura do CSV
# 2026-01-28 14:30:02 | DEBUG | CSV carregado: 30 linhas, 10 colunas
# 2026-01-28 14:30:02 | INFO | Iniciando sub-tarefa: Cálculo de estatísticas
# 2026-01-28 14:30:02 | DEBUG | Artigos compatíveis: 26/30 (86.7%)
# 2026-01-28 14:30:03 | WARNING | Artigo 53 sem dimensão GINGA válida
# 2026-01-28 14:30:05 | INFO | Relatório gerado: relatorio_compatibilidade_ginga.md
```

#### Checklist de Debugging
```
□ O CSV foi lido corretamente? (verificar encoding)
□ Todas as colunas foram identificadas? (verificar nomes)
□ Os scores estão em formato numérico? (verificar parsing)
□ Os artigos foram agrupados corretamente? (verificar lógica)
□ O arquivo de saída foi criado? (verificar permissões)
□ O template foi seguido? (verificar estrutura)
□ Os links estão funcionando? (verificar caminhos absolutos)
```

---

### 6.12. Variações do Agente para Casos Específicos

#### Variação A: Agente de Análise Comparativa
```markdown
# SYSTEM PROMPT ALTERNATIVO

Você é o **Agente Comparativo GINGA**.
Sua função é comparar DUAS minutas de lei diferentes
e identificar qual tem maior aderência ao framework GINGA.

# TAREFA
1. Leia os dois CSVs de entrada
2. Calcule estatísticas para cada um
3. Gere tabela comparativa lado a lado
4. Identifique pontos fortes de cada minuta
5. Recomende qual minuta adotar ou como mesclá-las
```

#### Variação B: Agente de Monitoramento Contínuo
```markdown
# SYSTEM PROMPT ALTERNATIVO

Você é o **Agente Monitor GINGA**.
Sua função é monitorar mudanças em minutas de lei
e alertar quando houver alterações que afetem a compatibilidade.

# TAREFA
1. Compare o CSV atual com o CSV anterior
2. Identifique artigos modificados
3. Recalcule scores apenas dos artigos alterados
4. Gere relatório de impacto das mudanças
5. Envie alerta se compatibilidade cair abaixo de 80%
```

#### Variação C: Agente de Sugestão de Emendas
```markdown
# SYSTEM PROMPT ALTERNATIVO

Você é o **Agente de Emendas GINGA**.
Sua função é propor textos CONCRETOS de emendas
para fortalecer a compatibilidade com GINGA.

# TAREFA
1. Leia os artigos com score < 60%
2. Para cada artigo, proponha:
   - Texto original do artigo
   - Texto sugerido com modificações
   - Justificativa técnica da emenda
   - Ganho estimado de score pós-emenda
3. Formate como documento legislativo formal
```

---

### 6.13. Comandos e Ferramentas Internas do Agente Antigravity

O Agente Antigravity **não usa bibliotecas Python externas** para gerar os relatórios. Ele opera com suas ferramentas nativas integradas:

#### Ferramentas Nativas Utilizadas

| Ferramenta             | Função                     | Exemplo de Uso                           |
| ---------------------- | -------------------------- | ---------------------------------------- |
| `view_file`            | Ler conteúdo de arquivos   | Ler o CSV de análise                     |
| `write_to_file`        | Criar novos arquivos       | Gerar o relatório .md ou .html           |
| `replace_file_content` | Editar arquivos existentes | Atualizar seções específicas             |
| `grep_search`          | Buscar padrões em arquivos | Encontrar artigos com termos específicos |
| `list_dir`             | Listar diretórios          | Descobrir arquivos disponíveis           |
| `view_file_outline`    | Ver estrutura de arquivo   | Entender organização do código           |



### 6.14. Skills e Competências Necessárias para Replicar

Para um humano ou outro agente replicar este trabalho, são necessárias as seguintes competências:

#### 📊 Skills de Análise de Dados

| Skill                            | Nível         | Descrição                                     |
| -------------------------------- | ------------- | --------------------------------------------- |
| **Leitura de CSV**               | Básico        | Entender estrutura de dados tabulares         |
| **Cálculo de Estatísticas**      | Básico        | Média, percentual, contagem, agrupamento      |
| **Classificação por Categorias** | Intermediário | Agrupar items por dimensões/critérios         |
| **Identificação de Outliers**    | Intermediário | Encontrar valores extremos (críticos/lacunas) |

#### ✍️ Skills de Redação Técnica

| Skill                           | Nível         | Descrição                                |
| ------------------------------- | ------------- | ---------------------------------------- |
| **Markdown Avançado**           | Intermediário | Tabelas, alertas, links, emojis          |
| **Estruturação de Relatórios**  | Avançado      | Criar hierarquia lógica de informações   |
| **Síntese de Informações**      | Avançado      | Transformar dados em insights acionáveis |
| **Redação Jurídica**            | Intermediário | Usar linguagem formal e precisa          |
| **Proposição de Recomendações** | Avançado      | Sugerir ações específicas e priorizadas  |

#### 🎨 Skills de Design e Front-end

| Skill               | Nível         | Descrição                              |
| ------------------- | ------------- | -------------------------------------- |
| **HTML5 Semântico** | Intermediário | Estruturar documento com tags corretas |
| **CSS3 Avançado**   | Intermediário | Custom Properties, Grid, Flexbox       |
| **CSS Print Media** | Avançado      | Configurar impressão A4 perfeita       |
| **Tipografia**      | Intermediário | Escolher e combinar fontes             |
| **Design System**   | Intermediário | Criar sistema de cores e componentes   |

#### 🧠 Skills de Análise de Framework

| Skill                       | Nível    | Descrição                                |
| --------------------------- | -------- | ---------------------------------------- |
| **Compreensão do GINGA**    | Avançado | Entender as 5 dimensões e seus conceitos |
| **Mapeamento Conceitual**   | Avançado | Relacionar artigos de lei com dimensões  |
| **Gap Analysis**            | Avançado | Identificar lacunas e oportunidades      |
| **Priorização Estratégica** | Avançado | Classificar por impacto e urgência       |

---

### 6.15. Fluxo de Raciocínio do Agente (Chain of Thought)

Abaixo está o raciocínio interno do agente durante a geração do relatório:

```
PENSAMENTO DO AGENTE (simulação):

1. "Preciso ler o CSV de análise para entender os dados..."
   → Executo view_file() no CSV
   → Identifico 30 linhas (artigos 45-74)
   → Identifico colunas: Art, Comp., Dimensão, % Conc., % Term.

2. "Agora preciso calcular as estatísticas gerais..."
   → Conto artigos com Comp.="SIM" → 26 artigos
   → Conto artigos com Comp.="NÃO" → 4 artigos
   → Calculo percentual: 26/30 = 86.7%

3. "Devo agrupar por dimensão GINGA..."
   → GOVERNANÇA: 8 artigos
   → INCENTIVOS: 5 artigos
   → NORMAS: 13 artigos (maior grupo!)
   → GESTÃO DE CAPACIDADES: 10 artigos
   → AMBIÊNCIA: 7 artigos
   → Nota: alguns artigos aparecem em mais de uma dimensão

4. "Preciso identificar os artigos críticos (score >= 70%)..."
   → Art. 59: Incentivos à inovação - crítico para INCENTIVOS
   → Art. 63: Sandboxes - crítico para NORMAS
   → Art. 66: Boa-fé em inovação - crítico para AMBIÊNCIA

5. "E os artigos não compatíveis..."
   → Art. 53, 54, 55: Gestão de patrimônio - sem conexão GINGA

6. "Para as recomendações, vou usar Gap Analysis..."
   → Lacuna 1: Falta termo 'segurança psicológica' → Sugerir inserção no Art. 57
   → Lacuna 2: Incentivos genéricos → Detalhar fundos e gratificações
   → Lacuna 3: Patrimônio sem conexão → Propor uso para hubs/labs

7. "Agora vou estruturar o relatório MD..."
   → Uso template definido no prompt
   → Adiciono alertas [!IMPORTANT] para oportunidades
   → Crio links para arquivos fonte
   → Formato tabelas com zebrado

8. "Por fim, gero o arquivo..."
   → Executo write_to_file() com o conteúdo completo
   → Verifico se arquivo foi criado com sucesso
```

---

### 6.16. Checklist de Competências para Criar Skill de Agente

Use este checklist para verificar se você tem as competências necessárias:

```
COMPETÊNCIAS DE DADOS
□ Sei ler e interpretar arquivos CSV
□ Sei calcular médias, percentuais e contagens
□ Sei agrupar dados por categorias
□ Sei identificar valores extremos (máximos/mínimos)

COMPETÊNCIAS DE REDAÇÃO
□ Domino Markdown avançado (tabelas, alertas, links)
□ Sei estruturar relatórios executivos
□ Sei transformar dados em recomendações acionáveis
□ Sei priorizar recomendações por impacto

COMPETÊNCIAS DE DESIGN
□ Sei escrever HTML semântico
□ Sei usar CSS Custom Properties
□ Sei configurar @media print para impressão
□ Sei escolher e combinar tipografias

COMPETÊNCIAS DE DOMÍNIO
□ Entendo o Framework GINGA e suas 5 dimensões
□ Sei mapear conceitos legais para dimensões GINGA
□ Sei identificar gaps de terminologia
□ Sei propor emendas textuais concretas

COMPETÊNCIAS DE AGENTE
□ Sei usar ferramentas de leitura de arquivos
□ Sei usar ferramentas de escrita de arquivos
□ Sei usar ferramentas de busca (grep)
□ Sei encadear sub-tarefas logicamente
```

---

### 6.17. Estimativa de Custos em Tokens e Dólares

#### Entrada (Input Tokens)

| Componente                  | Estimativa de Tokens |
| --------------------------- | -------------------- |
| CSV de Análise (30 artigos) | ~8.000 tokens        |
| System Prompt do Agente     | ~1.500 tokens        |
| Contexto do Framework GINGA | ~2.000 tokens        |
| Histórico de conversa       | ~3.000 tokens        |
| **Total Input**             | **~14.500 tokens**   |

#### Saída (Output Tokens)

| Componente                       | Estimativa de Tokens |
| -------------------------------- | -------------------- |
| Relatório Markdown (~210 linhas) | ~4.500 tokens        |
| Memorial HTML (~830 linhas)      | ~12.000 tokens       |
| **Total Output**                 | **~16.500 tokens**   |


---

### 6.18. Skills de Otimização de Custos

Para reduzir o consumo de tokens e custos de API, aplique estas técnicas:

#### 🗜️ Otimização de Dados de Entrada (CSV/Base de Dados)

| Técnica                                  | Economia    | Como Implementar                                  |
| ---------------------------------------- | ----------- | ------------------------------------------------- |
| **Selecionar apenas colunas essenciais** | -40% tokens | Remover "Inteiro Teor do Artigo" se não for usado |
| **Resumir textos longos**                | -30% tokens | Substituir artigo completo por "Ideia Geral"      |
| **Codificar categorias**                 | -15% tokens | "GOVERNANÇA" → "G", "INCENTIVOS" → "I"            |
| **Remover formatação**                   | -10% tokens | Eliminar aspas, espaços extras, quebras           |
| **Filtrar apenas relevantes**            | -50% tokens | Enviar só artigos com score < 70%                 |

**Exemplo de CSV Otimizado:**
```csv
# ANTES (original): ~8.000 tokens
Capítulo,Art,Inteiro Teor do Artigo,Ideia Geral,Comp.,Dimensão GINGA,% Conc.,% Term.,Justificativa,Comentários

# DEPOIS (otimizado): ~3.000 tokens
Art,Comp,Dim,Conc,Term
45,S,G,57,30
46,S,G,52,43
```

#### 🔌 Otimização de Chamadas de API

| Técnica                        | Economia           | Como Implementar                                  |
| ------------------------------ | ------------------ | ------------------------------------------------- |
| **Batch processing**           | -20% overhead      | Analisar 10 artigos por chamada em vez de 1       |
| **Caching de respostas**       | -80% em repetições | Armazenar análises já feitas em banco local       |
| **Prompts reutilizáveis**      | -50% contexto      | Mover definições GINGA para system prompt fixo    |
| **Streaming desativado**       | -5% latência       | Receber resposta completa de uma vez              |
| **Modelo adequado por tarefa** | -70% custo         | Usar Flash para triagem, Pro para relatório final |


#### 💾 Otimização de Banco de Dados

| Técnica                    | Benefício                      | Implementação                                 |
| -------------------------- | ------------------------------ | --------------------------------------------- |
| **Indexação por dimensão** | Consultas 10x mais rápidas     | `CREATE INDEX idx_dim ON artigos(dimensao)`   |
| **Materializar views**     | Evita recálculo                | `CREATE MATERIALIZED VIEW stats AS SELECT...` |
| **Cache de estatísticas**  | Zero chamadas para dados fixos | Armazenar contagens em tabela separada        |
| **Compressão de texto**    | -60% armazenamento             | Usar GZIP em campos de texto longo            |
| **Particionamento**        | Consultas em subset            | Particionar por capítulo/dimensão             |

**Script de Otimização SQL:**
```sql
-- Criar view materializada com estatísticas pré-calculadas
CREATE MATERIALIZED VIEW ginga_stats AS
SELECT 
    dimensao,
    COUNT(*) as total_artigos,
    SUM(CASE WHEN compativel = 'SIM' THEN 1 ELSE 0 END) as compativeis,
    AVG(score_conceitual) as media_conceitual,
    AVG(score_terminologico) as media_terminologica
FROM analise_artigos
GROUP BY dimensao;

-- Atualizar apenas quando necessário
REFRESH MATERIALIZED VIEW ginga_stats;
```

#### 📊 Checklist de Otimização

```
□ CSV contém apenas colunas necessárias?
□ Textos longos foram resumidos?
□ Categorias estão codificadas?
□ Há cache de análises anteriores?
□ Estou usando o modelo certo para cada tarefa?
□ Chamadas estão sendo feitas em batch?
□ Banco tem índices nas colunas de filtro?
□ Estatísticas estão pré-calculadas?
```


---


#### ✅ PASSO 7: Geração do Memorial HTML pelo Agente
**Objetivo:** O agente de IA gera o documento HTML formal usando o template abaixo como referência.

> [!TIP]
> Este passo também é executado pelo **Agente Memorial GINGA** configurado no PASSO 6. O agente usa o CSV de entrada e gera o HTML automaticamente.

**Template de Referência (o agente usa como base):**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memorial Técnico - [Título]</title>
    
    <!-- Fontes Premium -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        /* ===== VARIÁVEIS DE TEMA ===== */
        :root {
            --primary-color: #1a365d;    /* Azul Institucional */
            --secondary-color: #2d4a6f;
            --accent-color: #d69e2e;      /* Dourado */
            --text-dark: #1a202c;
            --text-medium: #4a5568;
            --bg-light: #f7fafc;
            --border-light: #e2e8f0;
        }

        /* ===== TIPOGRAFIA BASE ===== */
        body {
            font-family: 'Crimson Pro', Georgia, serif;
            font-size: 11pt;
            line-height: 1.6;
            color: var(--text-dark);
            background: white;
            max-width: 21cm;
            margin: 0 auto;
            padding: 2cm;
        }

        h1, h2, h3, h4 {
            font-family: 'Inter', sans-serif;
            color: var(--primary-color);
        }

        h1 {
            font-size: 24pt;
            text-transform: uppercase;
            border-bottom: 3px solid var(--primary-color);
            padding-bottom: 0.3em;
        }

        h2 {
            font-size: 16pt;
            border-left: 4px solid var(--accent-color);
            padding-left: 0.5em;
            margin-top: 2em;
        }

        /* ===== COMPONENTES ===== */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1em;
            margin: 1.5em 0;
        }

        .stat-card {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border: 1px solid var(--accent-color);
            border-radius: 8px;
            padding: 1em;
            text-align: center;
        }

        .stat-value {
            font-family: 'Inter', sans-serif;
            font-size: 24pt;
            font-weight: 700;
            color: var(--primary-color);
        }

        .stat-label {
            font-family: 'Inter', sans-serif;
            font-size: 9pt;
            color: var(--text-medium);
            text-transform: uppercase;
        }

        .highlight-box {
            margin: 1.5em 0;
            padding: 1.2em;
            border-radius: 8px;
            background: var(--bg-light);
            border-left: 4px solid var(--accent-color);
        }

        .highlight-box.success { background: #f0fff4; border-color: #38a169; }
        .highlight-box.warning { background: #fffaf0; border-color: #dd6b20; }

        .dimension-tag {
            display: inline-block;
            font-family: 'Inter', sans-serif;
            font-size: 8pt;
            font-weight: 600;
            text-transform: uppercase;
            padding: 0.3em 0.6em;
            background: var(--accent-color);
            color: white;
            border-radius: 3px;
        }

        /* ===== TABELAS ===== */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            font-family: 'Inter', sans-serif;
            font-size: 10pt;
        }

        th {
            background: var(--primary-color);
            color: white;
            padding: 0.8em;
            text-align: left;
        }

        td {
            padding: 0.7em;
            border-bottom: 1px solid var(--border-light);
        }

        tr:nth-child(even) { background: var(--bg-light); }

        /* ===== IMPRESSÃO ===== */
        @media print {
            body { font-size: 10pt; }
            @page { size: A4; margin: 2cm 2.5cm; }
            .no-break { page-break-inside: avoid; }
            .page-break { page-break-after: always; }
            .print-hide { display: none !important; }
        }
    </style>
</head>
<body>
    <!-- O AGENTE GERA O CONTEÚDO DINAMICAMENTE AQUI -->
</body>
</html>
```

**Erros Comuns e Soluções:**
| Erro                          | Causa                     | Solução                                        |
| ----------------------------- | ------------------------- | ---------------------------------------------- |
| Fontes não carregam           | Bloqueio de rede          | Usar fallback: `'Crimson Pro', Georgia, serif` |
| Tabelas cortadas na impressão | Quebra de página          | Adicionar classe `.no-break`                   |
| Cores não imprimem            | Configuração do navegador | Habilitar "Imprimir gráficos de fundo"         |

---

## 🤖 Resumo: Pipeline Completo com Agente de IA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE AUTOMÁTICO DE MEMORIAL GINGA                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FASE 1: PREPARAÇÃO DE DADOS (Scripts Python)                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ PASSO 1  │───▶│ PASSO 2  │───▶│ PASSO 3  │───▶│ PASSO 4  │              │
│  │ Extração │    │ Segmenta │    │ LLM JSON │    │ TF/Coss. │              │
│  │ DOCX     │    │ Regex    │    │          │    │ Script   │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│                                                         │                   │
│                                                         ▼                   │
│                                                  ┌──────────┐              │
│                                                  │ PASSO 5  │              │
│                                                  │ CSV      │              │
│                                                  │ Mestre   │              │
│                                                  └──────────┘              │
│                                                         │                   │
├─────────────────────────────────────────────────────────┼───────────────────┤
│                                                         │                   │
│  FASE 2: GERAÇÃO DE DOCUMENTOS (Agente de IA)          │                   │
│                                                         ▼                   │
│                         ┌─────────────────────────────────────┐             │
│                         │      AGENTE "MEMORIAL GINGA"        │             │
│                         │  ┌─────────────────────────────┐    │             │
│                         │  │ System Prompt + Ferramentas │    │             │
│                         │  └─────────────────────────────┘    │             │
│                         └─────────────────────────────────────┘             │
│                                     │                                       │
│                       ┌─────────────┴─────────────┐                        │
│                       ▼                           ▼                        │
│               ┌──────────────┐           ┌──────────────┐                  │
│               │   PASSO 6    │           │   PASSO 7    │                  │
│               │  Relatório   │           │   Memorial   │                  │
│               │     .md      │           │    .html     │                  │
│               └──────────────┘           └──────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Como Replicar Este Processo

### Para Novo Documento Legislativo:

1. **Substituir o arquivo de entrada** (Word/PDF da nova minuta)
2. **Ajustar regex de segmentação** se formato diferente
3. **Executar PASSOSs 1-5** (scripts Python)
4. **Acionar o Agente** com o prompt:
   ```
   Leia o CSV em [CAMINHO] e gere:
   1. Relatório de compatibilidade GINGA em Markdown
   2. Memorial técnico em HTML para impressão A4
   ```


