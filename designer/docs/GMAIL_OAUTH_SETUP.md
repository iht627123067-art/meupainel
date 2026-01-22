# 🔧 Guia de Setup - Automação de Gmail

Este guia documenta o processo completo para configurar a automação de acesso a emails para extração de Google Alerts, integrando Gmail API, Supabase Edge Functions e configurações de frontend.

---

## 🏗️ Pré-requisitos

1. **Supabase CLI** instalado e autenticado.
2. Acesso ao **Google Cloud Console**.
3. Projeto Supabase já configurado (`peoyosdnthdpnhejivqo`).

---

## 🚀 Passo 1: Configurar Google Cloud OAuth

### 1.1 Criar Projeto no Google Cloud
1. Acesse [console.cloud.google.com](https://console.cloud.google.com/).
2. Crie um novo projeto: `n8ngestor-482604` (ou use um existente).

### 1.2 Habilitar Gmail API
1. Vá em **APIs & Services** → **Enable APIs**.
2. Busque por "Gmail API" e clique em **Enable**.

### 1.3 Configurar OAuth Consent Screen
1. Vá em **APIs & Services** → **OAuth consent screen**.
2. Selecione **External** (ou Internal se for G Suite).
3. **App Information**:
   - Nome do app: `Meu Painel Web`
   - Email de suporte: seu email.
4. **Scopes**:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
5. **Test users**: Adicione os emails que usarão o sistema (ex: `ith627123067@gmail.com`).

### 1.4 Criar Credenciais OAuth 2.0
1. Vá em **APIs & Services** → **Credentials**.
2. Clique em **Create Credentials** → **OAuth client ID**.
3. Tipo: **Web application**.
4. **URIs de redirecionamento autorizados** (Adicione TODOS):
   ```
   http://localhost:8080/oauth/callback
   http://localhost:5173/oauth/callback
   https://peoyosdnthdpnhejivqo.supabase.co/oauth/callback
   ```
5. **Origens JavaScript**:
   ```
   http://localhost:8080
   http://localhost:5173
   ```
6. Guarde o **Client ID** e **Client Secret**.

---

## 🔑 Passo 2: Configurar Secrets no Supabase

Essenciais para que as Edge Functions autentiquem com o Google.

### Via Dashboard (Recomendado)
1. Acesse **Settings** → **Edge Functions** → **Secrets**.
2. Adicione os seguintes segredos:
   - `GOOGLE_CLIENT_ID`: `27165...` (Seu Client ID)
   - `GOOGLE_CLIENT_SECRET`: `GOCSPX...` (Seu Client Secret)
   - `GOOGLE_REDIRECT_URI`: `http://localhost:8080/oauth/callback` (Para dev local)

### Via CLI
```bash
supabase secrets set GOOGLE_CLIENT_ID=seu_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=seu_client_secret
```

---

## 💻 Passo 3: Configurar Variáveis no Frontend

Atualize o arquivo `.env` local para iniciar o fluxo OAuth:

**Arquivo:** `designer/.env`
```env
# ... outras variáveis ...
VITE_GOOGLE_CLIENT_ID="271652225298-1dlhf4snrotvs9c43j8ojg5n0btaa8l9.apps.googleusercontent.com"
```

---

## 🗄️ Passo 4: Banco de Dados (Migrations)

As tabelas necessárias foram criadas para armazenar tokens e logs de sincronização.

### 4.1 Tabelas OAuth e Logs (`20260121_gmail_oauth_tokens.sql`)

Esta migration cria:
- Tabela `gmail_oauth_tokens`: Armazena access/refresh tokens criptografados.
- Tabela `email_sync_logs`: Histórico de execuções de sincronização.
- Atualiza `email_accounts`: Adiciona flags `oauth_connected` e `sync_enabled`.

```sql
-- Principais Estruturas
CREATE TABLE IF NOT EXISTS gmail_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    -- ... outros campos
);

ALTER TABLE email_accounts ADD COLUMN auth_connected BOOLEAN DEFAULT FALSE;
```

### 4.2 Agendamento Automático (`20260121_gmail_cron_job.sql`)

Configura o `pg_cron` para rodar a sincronização automaticamente.

```sql
-- Sincronização às 06:00 e 18:00 UTC
SELECT cron.schedule('daily-gmail-sync', '0 6 * * *', $$ ... $$);
SELECT cron.schedule('evening-gmail-sync', '0 18 * * *', $$ ... $$);
```

---

## ⚡ Passo 5: Edge Functions (Backend Logic)

O sistema utiliza três funções principais implantadas no Supabase.

### 5.1 `exchange-gmail-token`
- **Função:** Troca o `code` recebido do Google por `access_token` e `refresh_token`.
- **Rota:** `/functions/v1/exchange-gmail-token`
- **Segurança:** Requer Secrets configurados.

### 5.2 `sync-gmail` (Atualizado)
- **Função:** Conecta no Gmail, busca emails, extrai conteúdo e salva em `alerts`.
- **Lógica Atualizada:**
  - Busca emails **APENAS** na label `alertas` (Pasta criada no Gmail).
  - Filtro: `label:alertas is:unread`.
  - Extrai links, títulos e data do corpo do email (HTML).
  - Marca o email como lido após processar.

**Trecho de Código Importante (`sync-gmail/index.ts`):**
```typescript
async function listGoogleAlertsEmails(accessToken: string): Promise<GmailMessage[]> {
    // FILTRO ESPECÍFICO: Pasta 'alertas' e não lidos
    const query = encodeURIComponent("label:alertas is:unread");
    
    const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=20`,
        // ... headers
    );
    // ...
}
```

### 5.3 `trigger-gmail-sync`
- **Função:** Gatilho simples chamado pelo Cron Job para iniciar o `sync-gmail` para todas as contas conectadas.

### Comandos de Deploy
```bash
# Navegue para a pasta do projeto
cd designer

# Deploy (Use --no-verify-jwt se for chamar via Cron/Service Role)
supabase functions deploy exchange-gmail-token --no-verify-jwt
supabase functions deploy sync-gmail --no-verify-jwt
supabase functions deploy trigger-gmail-sync --no-verify-jwt
```

---

## 🔍 Passo 6: Verificação e Uso

### 6.1 Fluxo do Usuário
1. Acesse o Frontend (`/settings`).
2. Clique em **"Conectar Gmail"**.
3. Complete o Login Google.
4. Após o retorno, verifique se a conta aparece como **"Conectado"**.

### 6.2 Teste de Sincronização
1. Garanta que existam emails não lidos na pasta **"alertas"** do Gmail conectado.
2. No Frontend, clique no botão **"Sincronizar"** na conta.
3. Vá para a página **"Alertas Gmail"** (`/alerts`) e verifique se os novos itens apareceram.

### 6.3 Verificação de Banco de Dados
Use o SQL Editor para confirmar:
```sql
-- Verificar conexão
SELECT email, oauth_connected FROM email_accounts;

-- Verificar alertas extraídos
SELECT title, created_at FROM alerts ORDER BY created_at DESC LIMIT 5;
```

---

## 🛠️ Troubleshooting

- **Erro 401 Unauthorized**:
  - Verifique se os Secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão no Supabase Dashboard.
  - Se `sync-gmail` falhar com 401, o token pode ter expirado e a renovação falhou. Desconecte e conecte novamente.

- **Nenhum alerta extraído**:
  - Verifique se os emails estão na label **exata** `alertas`.
  - Verifique se os emails estão **não lidos** (`is:unread`).
  - Verifique os logs da função: `supabase functions logs sync-gmail`.

- **Redirect URI Error**:
  - Certifique-se de que a URL exata do navegador (`http://localhost:8080` ou `5173`) está nas credenciais do Google Cloud.
