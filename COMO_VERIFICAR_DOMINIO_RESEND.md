# 🚀 Como Verificar seu Domínio no Resend

## ⚠️ PROBLEMA ATUAL

Você está recebendo este erro:
```
You can only send testing emails to your own email address (lireleiloesgestoes@gmail.com). 
To send emails to other recipients, please verify a domain at resend.com/domains
```

**Causa:** O domínio `grupoliraleiloes.com` não está verificado no Resend, então sua conta está em modo sandbox.

---

## ✅ SOLUÇÃO: Verificar o Domínio

### 📋 Passo 1: Acessar o Painel do Resend

1. Acesse: https://resend.com/login
2. Faça login com a conta `lireleiloesgestoes@gmail.com`
3. No menu lateral, clique em **"Domains"**

---

### 📋 Passo 2: Adicionar o Domínio

1. Clique em **"Add Domain"**
2. Digite: `grupoliraleiloes.com`
3. Clique em **"Add"**

O Resend vai gerar alguns registros DNS que você precisa adicionar.

---

### 📋 Passo 3: Configurar os Registros DNS

O Resend vai mostrar algo assim:

| Tipo | Nome | Valor |
|------|------|-------|
| TXT | @ | resend-verification=abc123... |
| MX | @ | feedback-smtp.resend.com (Priority: 10) |
| TXT | resend._domainkey | v=DKIM1; k=rsa; p=ABC123... |

**Você precisa adicionar esses registros no painel onde o domínio está hospedado.**

---

### 📋 Passo 4: Adicionar os Registros no Provedor de DNS

#### Se o domínio está na **Hostinger**:

1. Acesse: https://hpanel.hostinger.com/
2. Vá em **"Domínios"**
3. Selecione `grupoliraleiloes.com`
4. Clique em **"DNS / Name Servers"**
5. Clique em **"Gerenciar"**
6. Para cada registro do Resend:
   - Clique em **"Adicionar Novo Registro"**
   - Tipo: selecione o tipo (TXT, MX, etc.)
   - Nome: copie exatamente do Resend
   - Valor: copie exatamente do Resend
   - TTL: deixe padrão (3600)
   - Clique em **"Adicionar"**

#### Se o domínio está em outro provedor:

Acesse o painel do seu provedor (GoDaddy, Registro.br, etc.) e adicione os registros da mesma forma.

---

### 📋 Passo 5: Verificar no Resend

1. Volte para o painel do Resend
2. Aguarde alguns minutos (a propagação DNS pode levar de 5 minutos a 48 horas)
3. Clique em **"Verify DNS Records"**
4. Se aparecer ✅ verde em todos os registros, está pronto!

---

## 🎯 OPÇÃO ALTERNATIVA (Temporária)

### Se você NÃO tem acesso ao DNS do domínio:

Você pode usar o domínio de teste do Resend temporariamente, mas **só poderá enviar emails para lireleiloesgestoes@gmail.com**:

1. Mudar o email remetente para: `onboarding@resend.dev`
2. Só funciona para o seu email

**Não recomendado para produção!**

---

## 🔧 Como Mudar Temporariamente para Modo Teste

Se você quiser testar enquanto o domínio não é verificado:

1. Abra o app
2. Vá em **Configurações**
3. Em **"Email Remetente"**, mude de:
   - ❌ `notificacoes@grupoliraleiloes.com`
   - ✅ `onboarding@resend.dev`
4. Salve

**Limitação:** Só funcionará para envios ao email `lireleiloesgestoes@gmail.com`

---

## ❓ PERGUNTAS FREQUENTES

### 1. Quanto tempo leva a verificação?
- Normalmente 5-30 minutos após adicionar os registros DNS
- Em alguns casos, pode levar até 48 horas

### 2. Preciso de um domínio próprio?
- **Sim**, para enviar emails para outros destinatários
- O domínio precisa estar ativo e sob seu controle

### 3. Posso usar um subdomínio?
- **Sim!** Por exemplo: `leiloes.grupoliraleiloes.com`
- Adicione os registros DNS para o subdomínio

### 4. Tem algum custo?
- **Não!** O Resend é gratuito até 3.000 emails/mês
- A verificação de domínio também é gratuita

### 5. E se eu não tenho um domínio?
- Você precisará comprar um domínio (R$ 40-60/ano)
- Sugestões: Registro.br, Hostinger, GoDaddy

---

## 🎯 RESUMO DO QUE FAZER AGORA

**Opção A - Verificar Domínio (Recomendado):**
```
1. ✅ Acesse resend.com/domains
2. ✅ Adicione grupoliraleiloes.com
3. ✅ Copie os registros DNS
4. ✅ Adicione os registros no seu provedor de DNS
5. ✅ Aguarde e clique em "Verify"
6. ✅ Pronto! Pode enviar para qualquer email
```

**Opção B - Usar Modo Teste (Temporário):**
```
1. ⚠️ Mude o email remetente para: onboarding@resend.dev
2. ⚠️ Só funcionará para: lireleiloesgestoes@gmail.com
3. ⚠️ Não serve para produção
```

---

## 📞 PRECISA DE AJUDA?

Se você não tem acesso ao DNS do domínio ou está com dificuldades:

1. **Verifique quem gerencia o domínio** (pode ser diferente da hospedagem do site)
2. **Contate o suporte do provedor** com os registros DNS que o Resend forneceu
3. **Ou use um subdomínio** que você controla

---

## ✅ PRÓXIMOS PASSOS APÓS VERIFICAR

Depois que o domínio for verificado:

1. O email `notificacoes@grupoliraleiloes.com` funcionará automaticamente
2. Você poderá enviar emails para qualquer arrematante
3. Os emails não cairão mais em spam (maior deliverability)
4. Profissional e personalizado com seu domínio!

---

**Desenvolvido por Elion Softwares**

