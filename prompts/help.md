# 🚀 Guia Rápido - News Curator Python

## 📦 Instalação em 5 Minutos

### Passo 1: Preparar Ambiente
```bash
# Clone ou crie o diretório
mkdir news-curator && cd news-curator

# Crie o ambiente virtual
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows
```

### Passo 2: Instalar Dependências
```bash
# Crie requirements.txt
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
pip install sqlalchemy apscheduler click python-dotenv requests numpy
```

### Passo 3: Configurar Gmail API

**3.1 - Google Cloud Console**
1. Acesse: https://console.cloud.google.com
2. Crie novo projeto: "News Curator"
3. Ative Gmail API
4. Credenciais → Criar credenciais → ID do cliente OAuth
5. Tipo: "Aplicativo para computador"
6. Baixe `credentials.json`

**3.2 - Criar Label no Gmail**
1. Abra Gmail
2. Configurações → Labels
3. Crie label: "alertas"
4. Configure filtros automáticos

### Passo 4: Configurar .env
```bash
# Crie arquivo .env
cat > .env << 'EOF'
GMAIL_LABEL=alertas

DATABASE_URL=sqlite:///news_curator.db
WEB_PORT=8080
SIMILARITY_THRESHOLD=0.7
SCHEDULE_INTERVAL_MINUTES=30
EOF
```

### Passo 5: Executar
```bash
# Copie o código main.py do artifact anterior
# Execute primeira vez
python main.py run-once

# Ele vai abrir o navegador para autenticar Gmail
# Aprove e pronto!
```

---

## 🎯 Casos de Uso

### 1️⃣ Executar Manualmente
```bash
# Processar até 10 emails
python main.py run-once --max-emails 10

# Acesse interface de aprovação
# http://localhost:8080
```

### 2️⃣ Automação Completa
```bash
# Executa a cada 30 minutos automaticamente
python main.py schedule --interval 30

# Deixe rodando em background
nohup python main.py schedule --interval 30 > curator.log 2>&1 &
```

### 3️⃣ Apenas Interface Web
```bash
# Útil para revisar itens já processados
python main.py web
```

---

## 📊 Fluxo Visual Simplificado

```
📧 GMAIL
  │
  ├─ Label: "alertas"
  └─ Email não lido
       │
       ▼
🔍 FASE 1: EXTRAÇÃO
  │
  ├─ Assunto: "Tech News: AI Breakthrough"
  ├─ URLs: [url1, url2, url3]
  └─ Data: 2025-01-05
       │
       ▼
🧹 FASE 2: LIMPEZA URLs
  │
  ├─ Remove tracking (utm_, fbclid)
  ├─ Valida acessibilidade
  └─ Extrai domínio
       │
       ▼
🤖 FASE 3: CLASSIFICAÇÃO IA
  │
  ├─ Keywords: ["AI", "machine learning", "GPT"]
  ├─ Categoria: "tecnologia"
  ├─ Tipo: "artigo"
  └─ Duplicata? Não (similaridade: 0.3)
       │
       ▼
✅ FASE 4: APROVAÇÃO MANUAL
  │
  ├─ Interface Web → Aprovar ✓
  └─ Status: approved
       │
       ▼
📄 FASE 5: EXTRAÇÃO CONTEÚDO
  │
  ├─ Fetch HTML
  ├─ Convert to Markdown
  └─ Quality: good (850 palavras)
       │
       ▼
🧼 FASE 6: LIMPEZA CONTEÚDO
  │
  ├─ Remove ads
  ├─ Remove tracking links
  └─ Valida conteúdo
       │
       ▼
🎯 FASE 7: ROTEAMENTO
  │
  ├─ Classificação: "linkedin"
  ├─ Gera post LinkedIn
  └─ Salva no banco de dados
       │
       ▼
💾 BANCO DE DADOS
  └─ Item salvo com sucesso!
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Processar Email Específico
```python
# custom_processor.py
from main import NewsCuratorOrchestrator
import asyncio

async def process_specific():
    orchestrator = NewsCuratorOrchestrator()
    
    # Simula email já extraído
    email = {
        'email_id': '123',
        'email_subject': 'Nova IA da OpenAI',
        'snippet': 'OpenAI lança novo modelo...',
        'urls': ['https://techcrunch.com/ai-news'],
        'email_date': '1736035200000'
    }
    
    await orchestrator._process_email(email)

asyncio.run(process_specific())
```

### Exemplo 2: Consultar Banco de Dados
```python
# query_db.py
from main import Database

db = Database()

# Ver todos itens
items = db.get_all_items()
print(f"Total de itens: {len(items)}")

# Ver apenas aprovados
approved = [i for i in items if i['status'] == 'approved']
print(f"Aprovados: {len(approved)}")

# Ver por classificação
linkedin_items = [i for i in items if i['classification'] == 'linkedin']
print(f"Para LinkedIn: {len(linkedin_items)}")

# Exibir últimos 5
for item in items[-5:]:
    print(f"\n{item['title']}")
    print(f"  Status: {item['status']}")
    print(f"  Classificação: {item['classification']}")
    print(f"  URL: {item['url']}")
```

### Exemplo 3: Exportar para CSV
```python
# export_to_csv.py
import csv
from main import Database

db = Database()
items = db.get_all_items()

with open('news_export.csv', 'w', newline='', encoding='utf-8') as f:
    if items:
        writer = csv.DictWriter(f, fieldnames=items[0].keys())
        writer.writeheader()
        writer.writerows(items)

print(f"✅ Exportados {len(items)} itens para news_export.csv")
```

### Exemplo 4: Integração com Notion
```python
# notion_sync.py
from notion_client import Client
from main import Database

notion = Client(auth="seu_token_notion")
db = Database()

linkedin_items = [i for i in db.get_all_items() 
                  if i['classification'] == 'linkedin']

for item in linkedin_items:
    notion.pages.create(
        parent={"database_id": "seu_database_id"},
        properties={
            "Title": {"title": [{"text": {"content": item['title']}}]},
            "URL": {"url": item['url']},
            "Category": {"select": {"name": item['category']}},
            "Status": {"select": {"name": item['status']}}
        }
    )

print(f"✅ Sincronizados {len(linkedin_items)} itens com Notion")
```

---

## 🔧 Personalização

### Ajustar Threshold de Similaridade
```python
# config.py
SIMILARITY_THRESHOLD = 0.6  # Mais sensível (detecta mais duplicatas)
# ou
SIMILARITY_THRESHOLD = 0.8  # Menos sensível (menos duplicatas)
```

### Customizar Prompts de IA
```python
# main.py - Linha ~350
prompt = f"""
Você é um especialista em [SEU DOMÍNIO].

Analise o artigo focando em [SEUS CRITÉRIOS]:
- [Critério 1]
- [Critério 2]
- [Critério 3]

Artigo:
{item['content']}

Retorne JSON com suas classificações personalizadas.
"""
```

### Adicionar Novos Destinos
```python
# Adicione nova classificação
class FinalClassifier:
    async def classify_destination(self, item: Dict) -> Dict:
        # Adicione opção 'twitter' ou 'blog'
        classifications = ['linkedin', 'dissertacao', 'debate', 'twitter', 'blog']
        
        # ... seu código de classificação
        
        return classification
```

### Integrar com Slack
```python
# slack_notifier.py
from slack_sdk import WebClient

def notify_slack(item):
    client = WebClient(token="seu_token_slack")
    
    client.chat_postMessage(
        channel="#news-curator",
        text=f"📰 Nova notícia classificada!\n\n"
             f"*{item['title']}*\n"
             f"Categoria: {item['category']}\n"
             f"URL: {item['url']}\n"
             f"Classificação: {item['classification']}"
    )
```

---

## 📈 Monitoramento

### Ver Logs em Tempo Real
```bash
# Se rodando com nohup
tail -f curator.log

# Filtrar apenas erros
tail -f curator.log | grep ERROR

# Contar processamentos
grep "Item salvo com sucesso" curator.log | wc -l
```

### Dashboard Simples
```python
# dashboard.py
from main import Database
from collections import Counter

db = Database()
items = db.get_all_items()

print("\n📊 DASHBOARD - News Curator\n")
print(f"Total de itens: {len(items)}")

statuses = Counter(i['status'] for i in items)
print(f"\n📋 Por Status:")
for status, count in statuses.items():
    print(f"  {status}: {count}")

classifications = Counter(i.get('classification') for i in items if i.get('classification'))
print(f"\n🎯 Por Classificação:")
for classif, count in classifications.items():
    print(f"  {classif}: {count}")

categories = Counter(i['category'] for i in items)
print(f"\n📂 Por Categoria:")
for cat, count in categories.most_common(5):
    print(f"  {cat}: {count}")

duplicates = sum(1 for i in items if i.get('is_duplicate'))
print(f"\n🔄 Duplicatas detectadas: {duplicates}")

avg_similarity = sum(i.get('similarity_score', 0) for i in items) / len(items) if items else 0
print(f"📊 Similaridade média: {avg_similarity:.2%}")
```

---

## 🐛 Troubleshooting Rápido



### Erro: "Label 'alertas' não encontrada"
```bash
# Verifique se criou a label no Gmail
# Ou mude no .env:
GMAIL_LABEL=outro_nome
```

### Erro: "Invalid credentials"
```bash
# Delete token antigo e refaça auth
rm token.json
python main.py run-once
```

### Erro: "Rate limit exceeded"
```bash
# Aumente intervalo no .env
SCHEDULE_INTERVAL_MINUTES=60

# Ou processe menos emails por vez
python main.py run-once --max-emails 5
```

### Conteúdo não extrai bem
```bash
# O sistema usa fallback automático
# Se Jina Reader falhar, usa BeautifulSoup
# Para depurar, veja logs:
grep "Extração" curator.log
```

### Interface web não abre
```bash
# Verifique se porta está livre
lsof -i :8080

# Ou mude porta no .env
WEB_PORT=9090
```

---

## 🚀 Deploy em Produção

### Opção 1: Servidor Linux (VPS)
```bash
# No servidor
git clone seu-repo.git
cd news-curator

# Setup
./setup.sh

# Rode como serviço
sudo nano /etc/systemd/system/news-curator.service
```

**news-curator.service:**
```ini
[Unit]
Description=News Curator Service
After=network.target

[Service]
Type=simple
User=seu_usuario
WorkingDirectory=/home/seu_usuario/news-curator
ExecStart=/home/seu_usuario/news-curator/venv/bin/python main.py schedule --interval 30
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Ativar serviço
sudo systemctl enable news-curator
sudo systemctl start news-curator
sudo systemctl status news-curator
```

### Opção 2: Docker
```bash
# Build
docker build -t news-curator .

# Run
docker run -d \
  --name news-curator \
  -p 8080:8080 \
  -v $(pwd)/credentials.json:/app/credentials.json \
  -v $(pwd)/token.json:/app/token.json \
  news-curator
```

### Opção 3: Railway/Heroku
```bash
# Railway
railway link
railway up

# Heroku
heroku create news-curator
git push heroku main
```

---

## 💰 Custos Estimados


### Google Gmail API
- **Gratuito**: 1 bilhão de requisições/dia

### Jina Reader
- **Gratuito**: Sem limites

### Hospedagem
- **VPS básico**: $5-10/mês
- **Railway/Heroku**: $5-25/mês

**Total estimado**: $50-70/mês para 900 emails/mês

---

## ✅ Checklist de Setup

- [ ] Python 3.9+ instalado
- [ ] Ambiente virtual criado
- [ ] Dependências instaladas
- [ ] Google Cloud Console configurado
- [ ] credentials.json baixado
- [ ] Label "alertas" criada no Gmail
- [ ] Primeira execução bem-sucedida
- [ ] Interface web acessível
- [ ] Banco de dados criado
- [ ] Scheduler funcionando (opcional)
- [ ] Logs sendo gerados

---

## 🎓 Próximos Passos

1. **Teste com poucos emails** (5-10) primeiro
2. **Ajuste prompts de IA** conforme seus critérios
3. **Personalize classificações** para seu caso de uso
4. **Configure automação** quando tudo estiver ok
5. **Monitore custos** de API
6. **Faça backups** regulares do banco de dados
7. **Documente suas customizações**

---

## 📚 Recursos Adicionais

- **Gmail API Docs**: https://developers.google.com/gmail/api
- **Flask Docs**: https://flask.palletsprojects.com
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org

---

## 💬 Suporte

Precisa de ajuda? Posso auxiliar com:
- Configuração específica
- Customização de prompts
- Integração com outras ferramentas
- Debug de erros
- Otimização de performance

Basta perguntar! 🚀