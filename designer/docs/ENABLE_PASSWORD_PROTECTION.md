# Guia: Habilitar Proteção de Senha Vazada no Supabase

## 📋 Objetivo
Habilitar a proteção contra senhas vazadas (leaked passwords) no Supabase Auth para aumentar a segurança do sistema.

---

## 🔒 O que é Proteção de Senha Vazada?

O Supabase Auth pode verificar senhas contra o banco de dados **HaveIBeenPwned.org**, que contém bilhões de senhas comprometidas em vazamentos de dados. Quando habilitado:

- ✅ Impede que usuários usem senhas conhecidamente comprometidas
- ✅ Protege contra ataques de credential stuffing
- ✅ Melhora a segurança geral da aplicação

---

## 🚀 Como Habilitar

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. **Acesse o Dashboard do Supabase**
   - URL: https://supabase.com/dashboard
   - Faça login com sua conta

2. **Selecione o Projeto**
   - Projeto: `meupainel`
   - ID: `peoyosdnthdpnhejivqo`

3. **Navegue para Authentication**
   - No menu lateral, clique em **Authentication**
   - Depois clique em **Policies**

4. **Habilite Leaked Password Protection**
   - Procure por **"Password Strength"** ou **"Leaked Password Protection"**
   - Toggle o switch para **ON** (habilitado)
   - Clique em **Save** para salvar as alterações

5. **Configurações Adicionais (Opcional)**
   - **Minimum Password Length**: 8 caracteres (recomendado)
   - **Require Uppercase**: Opcional
   - **Require Lowercase**: Opcional
   - **Require Numbers**: Opcional
   - **Require Special Characters**: Opcional

---

### Opção 2: Via API do Supabase Management

Se preferir automatizar via API:

```bash
# Endpoint
POST https://api.supabase.com/v1/projects/{project_id}/config/auth

# Headers
Authorization: Bearer {supabase_access_token}
Content-Type: application/json

# Body
{
  "SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION": true,
  "PASSWORD_MIN_LENGTH": 8,
  "PASSWORD_REQUIRED_CHARACTERS": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  "SECURITY_LEAKED_PASSWORD_PROTECTION": true
}
```

**Nota**: Você precisará de um token de acesso da API do Supabase Management.

---

## ✅ Verificação

Após habilitar, você pode testar criando um novo usuário com uma senha comum:

```javascript
// Teste com senha fraca/vazada
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123' // Senha comum/vazada
});

// Deve retornar erro:
// "Password has been found in a data breach and cannot be used"
```

---

## 📊 Impacto

### Antes ⚠️
- ❌ Usuários podem usar senhas comprometidas
- ❌ Vulnerável a credential stuffing
- ❌ Baixa segurança de autenticação

### Depois ✅
- ✅ Senhas comprometidas bloqueadas
- ✅ Proteção contra credential stuffing
- ✅ Alta segurança de autenticação

---

## 🔍 Monitoramento

Após habilitar, você pode monitorar tentativas de uso de senhas vazadas:

1. **Dashboard → Authentication → Logs**
2. Procure por eventos do tipo:
   - `user_signup_failed` com motivo `leaked_password`
   - `password_recovery_failed` com motivo `leaked_password`

---

## 📝 Notas Importantes

1. **Impacto em Usuários Existentes**
   - Usuários existentes **não** serão forçados a trocar senhas
   - A verificação só ocorre em:
     - Novos cadastros
     - Alterações de senha
     - Recuperação de senha

2. **Performance**
   - A verificação adiciona ~100-200ms ao tempo de signup
   - Usa cache para melhorar performance
   - Não afeta login de usuários existentes

3. **Privacy**
   - O Supabase usa **k-Anonymity** para verificar senhas
   - Apenas os primeiros 5 caracteres do hash SHA-1 são enviados
   - A senha completa **nunca** é enviada para HaveIBeenPwned

---

## 🎯 Recomendações Adicionais

Para máxima segurança, considere também:

1. **Habilitar MFA (Multi-Factor Authentication)**
   ```javascript
   // Dashboard → Authentication → Providers
   // Enable "Phone" ou "TOTP" provider
   ```

2. **Configurar Política de Senha Forte**
   - Mínimo 12 caracteres
   - Exigir letras maiúsculas e minúsculas
   - Exigir números e caracteres especiais

3. **Implementar Rate Limiting**
   - Limitar tentativas de login
   - Proteger contra brute force

---

## 📚 Referências

- [Supabase Auth - Password Security](https://supabase.com/docs/guides/auth/password-security)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Status**: ⏳ Aguardando implementação manual via Dashboard

**Próximo Passo**: Acesse o dashboard do Supabase e siga os passos acima para habilitar a proteção.
