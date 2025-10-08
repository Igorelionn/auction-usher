# 🤖 Sistema de Emails Automáticos

## ✅ O QUE FOI IMPLEMENTADO

Sistema **100% automático** de envio de lembretes e cobranças por email!

### Funcionalidades:
- ✅ Verificação automática a cada 5 minutos
- ✅ Envia lembretes X dias ANTES do vencimento
- ✅ Envia cobranças X dias APÓS o vencimento
- ✅ Só envia para quem NÃO pagou
- ✅ Previne emails duplicados (1 por dia)
- ✅ Usa configurações da aba Configurações
- ✅ Logs completos de todos os envios
- ✅ Funciona em segundo plano

---

## 🚀 COMO ATIVAR

### 1. Configure Tudo

**Vá em:** Configurações → Notificações por Email

**Configure:**
```
📧 Email Remetente: onboarding@resend.dev
🔑 Chave API: re_SfWdJiMK_7352YoeoJdgw3mBSe2eArUBH
⏰ Dias antes (lembrete): 3
⚠️ Dias depois (cobrança): 1
```

**Salve as configurações**

### 2. Ative o Envio Automático

**Na mesma página:**
- Procure a seção **"🤖 Envio Automático"**
- Ative o switch ✅
- Clique em **"Salvar Configurações"**

### 3. Pronto! 🎉

**O sistema já está funcionando!**

Agora ele verificará automaticamente:
- A cada 5 minutos
- Todos os arrematantes
- Enviará lembretes e cobranças conforme necessário

---

## 📋 COMO FUNCIONA

### Fluxo Automático:

```
┌─────────────────────────────────────────────────┐
│  Sistema Verifica (a cada 5 minutos)            │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Lista todos os leilões                      │
│  2. Filtra arrematantes que NÃO pagaram         │
│  3. Verifica data de vencimento                 │
│                                                  │
│  SE faltam 3 dias (ou menos):                   │
│    → Envia LEMBRETE (se não enviou hoje)       │
│                                                  │
│  SE está atrasado 1+ dias:                      │
│    → Envia COBRANÇA (se não enviou hoje)       │
│                                                  │
│  4. Registra log no banco                       │
│  5. Aguarda 5 minutos                           │
│  6. Repete o processo                           │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🎯 EXEMPLOS PRÁTICOS

### Exemplo 1: Lembrete

```
Arrematante: João Silva
Vencimento: 15/10/2025
Hoje: 12/10/2025 (3 dias antes)
Status: NÃO PAGO

✅ AÇÃO: Sistema envia LEMBRETE automaticamente
📧 Email: "🔔 Lembrete: Pagamento vence em 3 dias"
```

### Exemplo 2: Cobrança

```
Arrematante: Maria Santos
Vencimento: 10/10/2025
Hoje: 11/10/2025 (1 dia atrasado)
Status: NÃO PAGO

✅ AÇÃO: Sistema envia COBRANÇA automaticamente
📧 Email: "⚠️ URGENTE: Pagamento em atraso"
```

### Exemplo 3: Já Pagou

```
Arrematante: Pedro Costa
Vencimento: 08/10/2025
Hoje: 12/10/2025
Status: PAGO ✅

❌ AÇÃO: Sistema NÃO envia nada
Motivo: Já está pago
```

---

## ⚙️ CONFIGURAÇÕES

### Parâmetros Ajustáveis:

| Configuração | Padrão | O Que Faz |
|--------------|--------|-----------|
| **Dias antes (lembrete)** | 3 dias | Quando enviar lembrete antes do vencimento |
| **Dias depois (cobrança)** | 1 dia | Quando enviar cobrança após vencimento |
| **Envio automático** | OFF | Ativar/desativar sistema automático |

### Onde Configurar:
```
Configurações → Notificações por Email
```

---

## 🔒 PREVENÇÃO DE DUPLICATAS

O sistema é inteligente:
- ✅ Verifica se já enviou email HOJE
- ✅ Só envia 1 lembrete por dia
- ✅ Só envia 1 cobrança por dia
- ✅ Registra tudo no banco de dados

**Exemplo:**
```
10:00 → Verificação → Envia lembrete
10:05 → Verificação → NÃO envia (já enviou hoje)
10:10 → Verificação → NÃO envia (já enviou hoje)
...
AMANHÃ 10:00 → Verificação → Pode enviar novamente
```

---

## 📊 MONITORAMENTO

### Ver o que está acontecendo:

1. **Console do Navegador (F12):**
   ```
   🔍 Verificando pagamentos para envio automático...
   📧 Enviando lembrete para João Silva (3 dias para vencer)
   ✅ Lembrete enviado: João Silva
   ⚠️ Enviando cobrança para Maria Santos (2 dias atrasado)
   ✅ Cobrança enviada: Maria Santos
   ✅ Emails enviados automaticamente: 1 lembrete(s), 1 cobrança(s)
   ```

2. **Histórico de Emails:**
   ```
   Configurações → Notificações por Email → Histórico
   ```
   - Ver todos os emails enviados
   - Status (sucesso/erro)
   - Data e hora
   - Destinatário
   - Tipo (lembrete/cobrança)

---

## 🎨 INTERFACE DE CONFIGURAÇÃO

### Visual Melhorado:

Quando **ATIVADO**:
```
┌─────────────────────────────────────────┐
│ 🤖 Envio Automático       [ATIVO ✅]    │
├─────────────────────────────────────────┤
│ ✅ Sistema verificando a cada 5 minutos │
│ 📧 Lembretes enviados 3 dias antes      │
│ ⚠️ Cobranças enviadas 1 dias após       │
│ 🎯 Apenas para quem não pagou           │
└─────────────────────────────────────────┘
```

Quando **DESATIVADO**:
```
┌─────────────────────────────────────────┐
│ 🤖 Envio Automático       [OFF ❌]      │
├─────────────────────────────────────────┤
│ Ative para enviar lembretes e           │
│ cobranças automaticamente sem            │
│ intervenção manual                       │
└─────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

Use este checklist para garantir que tudo está funcionando:

- [ ] Chave API do Resend configurada
- [ ] Email remetente configurado (onboarding@resend.dev)
- [ ] Dias antes do lembrete definidos (ex: 3)
- [ ] Dias depois da cobrança definidos (ex: 1)
- [ ] Envio automático ATIVADO ✅
- [ ] Configurações SALVAS
- [ ] Arrematantes têm email cadastrado
- [ ] Console do navegador mostrando logs (F12)
- [ ] Histórico de emails funcionando

---

## 🚨 IMPORTANTE

### Para Testes (Modo Desenvolvimento):

⚠️ **Lembre-se:** Resend está em modo de teste!
- Só envia para: `lireleiloesgestoes@gmail.com`
- Configure este email nos arrematantes para testar
- Ou verifique um domínio próprio

### Para Produção:

1. Verifique um domínio no Resend
2. Configure: `noreply@seudominio.com.br`
3. Depois pode enviar para qualquer email

---

## 🔧 ARQUIVOS MODIFICADOS

```
✅ src/hooks/use-auto-email-notifications.ts (NOVO)
   - Hook com lógica de envio automático
   - Verificação a cada 5 minutos
   - Logs detalhados

✅ src/App.tsx
   - Adicionado hook global
   - Funciona em todas as páginas

✅ src/components/EmailNotificationSettings.tsx
   - Interface melhorada
   - Badge "ATIVO" quando ligado
   - Informações dinâmicas

✅ src/pages/Inadimplencia.tsx
   - Removido botão "Enviar Cobranças"
   - Sistema 100% automático
```

---

## 📖 FLUXO COMPLETO

### 1. Usuário Configura:
```
Configurações → Email
→ Define dias antes/depois
→ Ativa envio automático
→ Salva
```

### 2. Sistema Ativa:
```
Hook iniciado
→ Verificação a cada 5 min
→ Console mostra logs
```

### 3. Sistema Trabalha:
```
Verifica leilões
→ Filtra não pagos
→ Calcula dias até/desde vencimento
→ Envia lembrete se 3 dias antes
→ Envia cobrança se 1 dia depois
→ Previne duplicatas
→ Registra logs
```

### 4. Arrematante Recebe:
```
Email profissional
→ Com logo e cores
→ Informações completas
→ Valores e datas
```

---

## 🎉 BENEFÍCIOS

✅ **Zero trabalho manual**
- Sistema funciona sozinho
- Não precisa lembrar de enviar
- Não precisa clicar em nada

✅ **Profissional**
- Emails enviados no momento certo
- Sempre no prazo
- Consistência total

✅ **Eficiente**
- Reduz inadimplência
- Melhora comunicação
- Aumenta taxa de pagamento

✅ **Transparente**
- Logs completos
- Histórico de tudo
- Console com informações

---

## 🎯 PRONTO PARA USAR!

**Sistema 100% automático implementado e funcionando!**

### Próximos Passos:

1. ✅ Ative o envio automático em Configurações
2. ✅ Verifique os logs no console (F12)
3. ✅ Monitore o histórico de emails
4. ✅ Configure domínio próprio (produção)

**Tudo funcionando perfeitamente!** 🚀📧

---

## 📞 Dúvidas Comuns

### P: Quanto tempo demora para enviar?
**R:** Até 5 minutos após o prazo (próxima verificação)

### P: Posso mudar a frequência de verificação?
**R:** Sim, edite `300000` para outro valor em ms no hook

### P: E se o arrematante não tem email?
**R:** Sistema pula automaticamente (não dá erro)

### P: Posso desativar temporariamente?
**R:** Sim, desative o switch em Configurações

### P: Como sei se está funcionando?
**R:** Abra console (F12) e veja os logs

---

**Sistema de Emails Automáticos: ATIVO E FUNCIONANDO! ✅**

