# 🚀 DEPLOY MANUAL - EDGE FUNCTION

## ⚡ SITUAÇÃO ATUAL

✅ Código atualizado com:
- Nova API Key: `re_HVRGMxM1_D2T7xwKk96YKRfH7fczu847P`
- Domínio verificado: `grupoliraleiloes.com`
- Email remetente: `notificacoes@grupoliraleiloes.com`

❗ **Falta apenas:** Fazer o deploy da Edge Function no Supabase

---

## 🎯 OPÇÃO 1: Deploy via Terminal (Recomendado)

### Passo a Passo:

1. **Abra o terminal** (PowerShell ou CMD)

2. **Navegue até a pasta do projeto:**
   ```bash
   cd "c:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher"
   ```

3. **Execute o comando de deploy:**
   ```bash
   npx supabase functions deploy send-email --no-verify-jwt
   ```

4. **Quando aparecer a lista de projetos, selecione:**
   ```
   4. moojuqphvhrhasxhaahd [name: Arthur Lira Leilões, ...]
   ```
   
   **Como selecionar:**
   - Use as **setas ↑↓** para mover
   - Ou digite **4** 
   - Pressione **Enter**

5. **Aguarde o deploy:**
   ```
   ✓ Deploying Function send-email (project: moojuqphvhrhasxhaahd)
   ✓ Function send-email deployed!
   ```

6. **✅ PRONTO!**

---

## 🌐 OPÇÃO 2: Deploy via Painel Supabase (Mais Fácil)

Se preferir usar interface gráfica:

### Passo 1: Copiar o Código

Abra o arquivo: `supabase/functions/send-email/index.ts`

**Ou copie direto daqui:**

```typescript
// Supabase Edge Function para enviar emails via Resend
// Esta função atua como intermediário seguro entre o frontend e o Resend API
// Configuração: verify_jwt = false (permite acesso público com chave API)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  from?: string
  resendApiKey?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, from, resendApiKey }: EmailRequest = await req.json()

    // Validar dados obrigatórios
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios faltando: to, subject, html' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar que a chave API do Resend foi fornecida
    // Esta é a nossa camada de segurança já que verify_jwt está desabilitado
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Chave API do Resend é obrigatória' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar formato básico da chave Resend (deve começar com re_)
    if (!resendApiKey.startsWith('re_')) {
      return new Response(
        JSON.stringify({ 
          error: 'Chave API do Resend inválida' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const apiKey = resendApiKey

    // Email remetente padrão (domínio verificado)
    const fromEmail = from || 'Arthur Lira Leilões <notificacoes@grupoliraleiloes.com>'

    console.log('Enviando email para:', to)

    // Fazer a chamada ao Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Erro do Resend:', resendData)
      return new Response(
        JSON.stringify({ 
          error: resendData.message || 'Erro ao enviar email',
          details: resendData
        }),
        { 
          status: resendResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Email enviado com sucesso:', resendData.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        id: resendData.id,
        message: 'Email enviado com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno ao enviar email' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

### Passo 2: Acessar o Painel Supabase

1. Acesse: https://supabase.com/dashboard
2. Faça login
3. Selecione o projeto: **Arthur Lira Leilões**

**Ou acesse diretamente:**
https://supabase.com/dashboard/project/moojuqphvhrhasxhaahd

### Passo 3: Atualizar a Edge Function

1. No menu lateral, clique em **"Edge Functions"**
2. Encontre a função: **send-email**
3. Clique nela para abrir
4. Clique em **"Edit"** ou ícone de edição (lápis)
5. Cole o código copiado acima
6. Clique em **"Deploy"** ou **"Save & Deploy"**
7. Aguarde a mensagem de sucesso ✅

### Passo 4: Verificar o Deploy

1. Na mesma página, clique na aba **"Logs"**
2. Deixe os logs abertos
3. Faça um teste de envio de email no app
4. Veja os logs aparecendo em tempo real

---

## ✅ DEPOIS DO DEPLOY

### 1. Limpar Cache do Navegador

Como você tinha a API key antiga salva:

1. Abra o app no navegador
2. Pressione **F12** (DevTools)
3. Vá na aba **Application** ou **Aplicação**
4. Clique em **Local Storage** > Seu domínio
5. Encontre a chave: `email_config`
6. Delete
7. Recarregue a página (**F5**)

**Ou:**
- Navegação Anônima / Aba Privada
- Ctrl + Shift + Delete > Limpar dados

### 2. Testar o Sistema

1. Abra o aplicativo
2. Faça login
3. Vá em **Configurações**
4. Verifique:
   - ✅ Email Remetente: `notificacoes@grupoliraleiloes.com`
5. Vá em **Arrematantes**
6. Clique em um arrematante com email
7. Envie um email de teste

### 3. Verificar Sucesso

**Você deve ver:**
```
✅ Email enviado com sucesso para [email]
```

**Não mais:**
```
❌ Erro: You can only send testing emails to your own email address
```

---

## 🎯 RESUMO RÁPIDO

```bash
# OPÇÃO 1 - Terminal:
cd "c:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher"
npx supabase functions deploy send-email --no-verify-jwt
# Selecione: 4. Arthur Lira Leilões
```

```
OPÇÃO 2 - Painel:
1. https://supabase.com/dashboard/project/moojuqphvhrhasxhaahd
2. Edge Functions > send-email > Edit
3. Cole o código > Deploy
```

---

## 📞 PROBLEMAS?

### Erro de autenticação no CLI?
```bash
npx supabase login
```

### Edge Function não aparece no painel?
- Crie uma nova: Functions > Create New Function
- Nome: `send-email`
- Cole o código
- Deploy

### Ainda erro 403?
- Verifique se limpou o cache do navegador
- Verifique se a nova API key está configurada
- Veja os logs da Edge Function

---

## 🎉 TUDO PRONTO!

Depois do deploy você terá:
- ✅ Domínio verificado
- ✅ API key de produção
- ✅ Email profissional
- ✅ Envio para qualquer destinatário
- ✅ Sistema completo funcionando!

**Desenvolvido por Elion Softwares**

