# 🚀 Deploy da Edge Function Atualizada

## ⚡ O QUE FOI ALTERADO?

A Edge Function `send-email` foi atualizada para usar o **modo teste** do Resend.

**Alteração:**
- ❌ Antes: `notificacoes@grupoliraleiloes.com`
- ✅ Agora: `onboarding@resend.dev`

---

## 📋 COMO FAZER O DEPLOY

### Opção 1: Via Painel Supabase (Mais Fácil)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: **Arthur Lira Leilões**
3. No menu lateral, clique em **"Edge Functions"**
4. Encontre a função: `send-email`
5. Clique em **"Edit"** ou **"Update"**
6. Cole o conteúdo do arquivo: `supabase/functions/send-email/index.ts`
7. Clique em **"Deploy"**
8. ✅ Aguarde 1 minuto

### Opção 2: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
# No terminal, dentro da pasta do projeto:
cd "c:\Users\igore\Aplicativo de Leilão Arthur Lira\auction-usher"

# Deploy da função
supabase functions deploy send-email --no-verify-jwt

# ✅ Pronto!
```

---

## 🧪 TESTANDO

Após o deploy, teste enviando um email:

1. Abra o app
2. Vá em **Configurações**
3. Verifique se o email remetente é: `onboarding@resend.dev`
4. Vá em **Arrematantes** ou **Inadimplência**
5. Tente enviar um email de teste

**⚠️ IMPORTANTE:**
- Só funcionará para o email: `lireleiloesgestoes@gmail.com`
- Para enviar para outros emails, você precisa verificar o domínio

---

## 📊 LOGS E DEBUGGING

Para ver se o deploy funcionou:

1. No painel do Supabase
2. Vá em **Edge Functions**
3. Clique em `send-email`
4. Clique na aba **"Logs"**
5. Envie um email de teste
6. Veja os logs em tempo real

---

## ⏭️ PRÓXIMOS PASSOS

### Para Modo Teste (Atual):
- ✅ Deploy feito
- ✅ Pode enviar para: lireleiloesgestoes@gmail.com
- ⚠️ Não serve para produção

### Para Modo Produção:
1. Verifique o domínio `grupoliraleiloes.com` no Resend
2. Mude o email remetente para: `notificacoes@grupoliraleiloes.com`
3. Faça novo deploy da Edge Function
4. ✅ Funcionará para qualquer email!

---

**Desenvolvido por Elion Softwares**

