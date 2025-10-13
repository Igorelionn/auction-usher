# 🔍 DIAGNÓSTICO - EMAIL NÃO ENVIADO

## 🚨 PROBLEMA REPORTADO

Os emails não estão sendo enviados com sucesso.

---

## 📋 COMO DIAGNOSTICAR O PROBLEMA

### Passo 1: Abrir o Console do Navegador

1. **Abra o site:** https://auction-usher.vercel.app
2. **Pressione F12** (ou clique com botão direito → "Inspecionar")
3. **Vá para a aba "Console"**

### Passo 2: Tentar Enviar um Email

1. Vá para **Inadimplência**
2. Clique em qualquer botão de **"Enviar Cobrança"**
3. **Observe os logs no console**

### Passo 3: Identificar o Problema

Os logs agora são **muito detalhados** e vão mostrar exatamente onde está o erro:

---

## 📊 TIPOS DE ERRO POSSÍVEIS

### ❌ ERRO 1: Chave API Não Configurada

**Log no Console:**
```
❌ Chave API do Resend não configurada
```

**Solução:**
1. Vá em **Configurações** → **Notificações por Email**
2. Cole a chave API: `re_HVRGMxM1_D2T7xwKk96YKRfH7fczu847P`
3. Clique em "Salvar Configurações"
4. Tente enviar novamente

---

### ❌ ERRO 2: Edge Function Não Encontrada (404)

**Log no Console:**
```
📨 Response Status: 404 Not Found
❌ Erro na resposta: Function not found
```

**Causa:** A Edge Function do Supabase não está deployada ou não existe.

**Solução:**

#### Opção A: Deploy da Edge Function (Recomendado)

Execute os comandos no terminal:

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Fazer login no Supabase
supabase login

# 3. Linkar o projeto
supabase link --project-ref moojuqphvhrhasxhaahd

# 4. Deploy da função
supabase functions deploy send-email
```

#### Opção B: Verificar no Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/moojuqphvhrhasxhaahd
2. Vá em **Edge Functions**
3. Verifique se existe a função `send-email`
4. Se não existir, precisa fazer o deploy

---

### ❌ ERRO 3: Domínio Não Verificado

**Log no Console:**
```
📨 Response Status: 400 Bad Request
❌ Erro na resposta: Domain not verified
```

**Causa:** O domínio `grupoliraleiloes.com` não está verificado no Resend.

**Solução:**

1. **Acesse:** https://resend.com/domains
2. **Verificar se `grupoliraleiloes.com` está na lista**
3. **Se não estiver verificado:**
   - Clique no domínio
   - Copie os registros DNS (SPF, DKIM, DMARC)
   - Adicione no painel DNS do domínio (onde está hospedado)
   - Aguarde 24-48h para propagação

---

### ❌ ERRO 4: Chave API Inválida

**Log no Console:**
```
📨 Response Status: 401 Unauthorized
❌ Erro na resposta: Invalid API key
```

**Causa:** A chave API do Resend está incorreta ou expirada.

**Solução:**

1. Acesse: https://resend.com/api-keys
2. Verifique se a chave `re_HVRGMxM1_D2T7xwKk96YKRfH7fczu847P` está ativa
3. Se não estiver, gere uma nova chave
4. Atualize em **Configurações** → **Notificações por Email**

---

### ❌ ERRO 5: Email Destinatário Inválido

**Log no Console:**
```
📨 Response Status: 400 Bad Request
❌ Erro na resposta: Invalid recipient email
```

**Causa:** O email do arrematante está incorreto.

**Solução:**

1. Vá em **Arrematantes**
2. Edite o arrematante
3. Corrija o email
4. Salve e tente novamente

---

### ❌ ERRO 6: CORS ou Bloqueio de Rede

**Log no Console:**
```
❌ Erro ao enviar email: Failed to fetch
```

**Causa:** Problema de CORS ou bloqueio de rede.

**Solução:**

1. **Verificar CORS no Supabase:**
   - Acesse: https://supabase.com/dashboard/project/moojuqphvhrhasxhaahd
   - Vá em **Settings** → **API**
   - Adicione `https://auction-usher.vercel.app` nas URLs permitidas

2. **Verificar Firewall/Antivírus:**
   - Desative temporariamente para testar
   - Adicione exceção para `supabase.co`

---

## 🔧 LOGS DETALHADOS

Agora, quando você tentar enviar um email, verá logs assim no console:

```
📧 Iniciando envio de email...
   Para: joao@email.com
   Assunto: Notificação de Débito em Aberto - Leilão Teste
   URL da Edge Function: https://moojuqphvhrhasxhaahd.supabase.co/functions/v1/send-email
   Email Remetente: notificacoes@grupoliraleiloes.com

📦 Request Body: {
  "to": "joao@email.com",
  "subject": "Notificação de Débito em Aberto - Leilão Teste",
  "from": "Arthur Lira Leilões <notificacoes@grupoliraleiloes.com>",
  "resendApiKey": "***configurada***",
  "htmlLength": 5432
}

📨 Response Status: 200 OK

📥 Response Data: {
  "success": true,
  "messageId": "abc123..."
}

✅ Email enviado com sucesso!
```

---

## 🧪 TESTE PASSO A PASSO

### 1. Limpar Cache e Configurações

```javascript
// Cole isso no console do navegador:
localStorage.clear();
location.reload();
```

### 2. Configurar Novamente

1. Vá em **Configurações** → **Notificações por Email**
2. Configure:
   - **Chave API:** `re_HVRGMxM1_D2T7xwKk96YKRfH7fczu847P`
   - **Email Remetente:** `notificacoes@grupoliraleiloes.com`
3. Salve

### 3. Criar Leilão de Teste

1. Crie um leilão chamado "Teste Email"
2. Adicione arrematante com **seu email**
3. Configure data vencimento no passado

### 4. Tentar Enviar

1. Vá em **Inadimplência**
2. Clique em **"Enviar Cobrança"**
3. **Veja os logs no console (F12)**

### 5. Copiar Logs

1. **Clique com botão direito** nos logs
2. **"Copy all"** ou tire um print
3. Me envie para análise

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### Configuração:
- [ ] Chave API do Resend configurada
- [ ] Email remetente correto: `notificacoes@grupoliraleiloes.com`
- [ ] Console do navegador aberto (F12)

### Supabase:
- [ ] Edge Function `send-email` existe
- [ ] Edge Function está deployada
- [ ] CORS configurado corretamente

### Resend:
- [ ] Domínio `grupoliraleiloes.com` verificado
- [ ] Chave API ativa e válida
- [ ] Sem problemas na dashboard

### Rede:
- [ ] Internet funcionando
- [ ] Firewall não bloqueando
- [ ] CORS permitindo o domínio

---

## 🚀 PRÓXIMOS PASSOS

### Passo Imediato:

1. **Fazer deploy desta correção:**
```bash
git add .
git commit -m "debug: adicionar logs detalhados para diagnóstico de emails"
git push origin main
```

2. **Aguardar deploy (2-3 minutos)**

3. **Testar novamente e verificar logs**

### Com os Logs:

Quando você tentar enviar um email e **copiar os logs do console**, conseguirei identificar **exatamente** qual é o problema:

- ❌ **404?** → Edge Function não existe
- ❌ **401?** → Chave API inválida  
- ❌ **400?** → Domínio não verificado ou email inválido
- ❌ **CORS?** → Configuração de CORS
- ✅ **200?** → Email enviado! (problema pode estar no Resend)

---

## 📞 COMO REPORTAR O ERRO

Quando você testar, me envie:

1. **Print do console** (F12) mostrando os logs
2. **Mensagem de erro** exata
3. **Status da resposta** (200, 400, 404, etc.)
4. **Response Data** (se houver)

Com essas informações, conseguirei resolver o problema específico!

---

**Arquivo atualizado com logs detalhados!**  
**Faça o deploy e teste novamente.**  
**Os logs vão mostrar exatamente onde está o problema.** 🔍

