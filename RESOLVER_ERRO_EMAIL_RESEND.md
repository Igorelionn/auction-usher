# 📧 Resolver Erro de Email do Resend

## ⚠️ Erro Atual

```
Error: You can only send testing emails to your own email address (lireleiloesgestoes@gmail.com). 
To send emails to other recipients, please verify a domain at resend.com/domains, 
and change the `from` address to an email using this domain.
```

---

## 🔍 O Que Está Acontecendo

O **Resend** está em **modo sandbox/teste** e só permite enviar emails para o email cadastrado (`lireleiloesgestoes@gmail.com`).

Para enviar emails para **qualquer destinatário** (arrematantes, clientes, etc.), você precisa:

1. ✅ Verificar um domínio no Resend
2. ✅ Usar um email do domínio verificado como remetente

---

## 🎯 Solução: Verificar Domínio no Resend

### **Passo 1: Acessar o Painel do Resend**

1. Acesse: https://resend.com/login

2. Faça login com sua conta

3. Vá em **"Domains"** no menu lateral

---

### **Passo 2: Adicionar Domínio**

1. Clique em **"Add Domain"** ou **"Adicionar Domínio"**

2. Digite o domínio: **`grupoliraleiloes.com`**
   - ⚠️ **NÃO** use `www.grupoliraleiloes.com`
   - Use apenas `grupoliraleiloes.com`

3. Clique em **"Add"**

---

### **Passo 3: Configurar Registros DNS**

O Resend vai mostrar 3 registros DNS que você precisa adicionar:

#### **Registro SPF (TXT)**
```
Tipo: TXT
Nome: @  (ou vazio)
Valor: v=spf1 include:_spf.resend.com ~all
```

#### **Registro DKIM (TXT)**
```
Tipo: TXT
Nome: resend._domainkey
Valor: [valor fornecido pelo Resend, algo como]
k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...
```

#### **Registro DMARC (TXT)**
```
Tipo: TXT
Nome: _dmarc
Valor: v=DMARC1; p=none
```

---

### **Passo 4: Adicionar Registros DNS**

#### **Onde Adicionar:**

1. Acesse o painel onde você **comprou o domínio**:
   - Registro.br (se for .com.br)
   - GoDaddy
   - Namecheap
   - Hostinger (se o domínio está lá)
   - Ou outro registrador

2. Vá em **"DNS Management"** ou **"Gerenciar DNS"**

3. Adicione os 3 registros TXT que o Resend forneceu

4. Salve as alterações

---

### **Passo 5: Verificar Domínio no Resend**

1. Volte ao painel do Resend

2. Clique em **"Verify"** ao lado do domínio

3. Aguarde a verificação (pode levar alguns minutos)

4. ✅ Quando aparecer **"Verified"**, está pronto!

---

### **Passo 6: Atualizar Email Remetente no Código**

Depois que o domínio for verificado, você precisa atualizar o email remetente no código.

**Atualmente está assim:**
```typescript
from: 'lireleiloesgestoes@gmail.com'
```

**Deve mudar para:**
```typescript
from: 'noreply@grupoliraleiloes.com'
// ou
from: 'leiloes@grupoliraleiloes.com'
// ou qualquer email usando o domínio verificado
```

---

## 🔧 Alternativa Temporária: Modo de Teste

Se você quiser testar os emails **AGORA** sem verificar domínio:

### **Opção 1: Enviar Apenas para Seu Email**

Enquanto não verifica o domínio, todos os emails serão enviados apenas para `lireleiloesgestoes@gmail.com`.

Você pode modificar temporariamente o código para sempre enviar para seu email:

```typescript
// Modo de teste - sempre enviar para o email cadastrado
const emailDestinatario = 'lireleiloesgestoes@gmail.com'; // Forçar seu email
```

### **Opção 2: Usar Outro Serviço de Email**

Se não quiser verificar domínio agora, pode usar outro serviço:

- **SendGrid** (100 emails/dia grátis)
- **Mailgun** (5.000 emails/mês grátis nos primeiros 3 meses)
- **SMTP Gmail** (com senha de app)

---

## 📋 Resumo da Configuração DNS

Para referência rápida, você vai adicionar 3 registros TXT:

| Tipo | Nome | Valor |
|------|------|-------|
| TXT | @ | v=spf1 include:_spf.resend.com ~all |
| TXT | resend._domainkey | [valor fornecido pelo Resend] |
| TXT | _dmarc | v=DMARC1; p=none |

---

## ✅ Após Verificar o Domínio

Quando o domínio estiver verificado no Resend:

1. ✅ Você poderá enviar emails para **qualquer destinatário**
2. ✅ Os emails sairão de `seuemail@grupoliraleiloes.com`
3. ✅ Melhor reputação de envio (menos chance de spam)
4. ✅ Emails profissionais e confiáveis

---

## 🎯 Configuração Recomendada

**Email de envio sugerido:**
```
noreply@grupoliraleiloes.com
```

**Ou:**
```
leiloes@grupoliraleiloes.com
```

**Ou:**
```
contato@grupoliraleiloes.com
```

---

## 📊 Status Atual vs Após Verificação

| Aspecto | Antes (Modo Teste) | Depois (Verificado) |
|---------|-------------------|---------------------|
| Destinatários | Só seu email | Qualquer email |
| Remetente | Gmail | Domínio próprio |
| Limite de emails | Limitado | Maior (depende do plano) |
| Reputação | N/A | Melhor entrega |
| Profissionalismo | Baixo | Alto |

---

## 🆘 Precisa de Ajuda?

Se tiver dificuldade em:
- Acessar painel do registrador do domínio
- Adicionar registros DNS
- Verificar o domínio no Resend

Me avise e posso te ajudar passo a passo!

---

## 📞 Links Úteis

- **Resend Dashboard:** https://resend.com/domains
- **Documentação Resend:** https://resend.com/docs/dashboard/domains/introduction
- **Suporte Resend:** https://resend.com/support

---

**💡 Dica:** Verificar o domínio é um processo único. Depois de feito, funciona para sempre!

