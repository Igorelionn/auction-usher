# 📧 Guia de Configuração do Sistema de Notificações por Email

## Visão Geral

O sistema de notificações automáticas por email foi implementado com sucesso! Agora você pode enviar:

- ✅ **Lembretes de Pagamento** - Enviados antes do vencimento
- ✅ **Cobranças de Atraso** - Enviadas após o vencimento
- ✅ **Confirmações de Pagamento** - Enviadas quando um pagamento é recebido

---

## 🚀 Configuração Inicial

### 1. Criar Tabela no Supabase

Primeiro, você precisa criar a tabela para rastrear os emails enviados:

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Copie e execute o código do arquivo `migrations/create_email_logs_table.sql`
4. Clique em **RUN** para executar a migração

### 2. Configurar o Resend

1. **Criar Conta no Resend:**
   - Acesse [resend.com](https://resend.com/signup)
   - Crie uma conta gratuita (100 emails/dia grátis)

2. **Obter Chave API:**
   - Faça login no Resend
   - Vá em **API Keys** no menu lateral
   - Clique em **Create API Key**
   - Dê um nome (ex: "Arthur Lira Leilões")
   - Copie a chave que começa com `re_...`
   - ⚠️ **IMPORTANTE:** Salve essa chave, ela só é mostrada uma vez!

3. **Verificar Email/Domínio:**
   - No Resend, vá em **Domains**
   - Clique em **Add Domain**
   - Adicione seu domínio ou use o domínio de teste do Resend
   - Para email `lireleiloesgestoes@gmail.com`, você pode:
     - Usar o domínio de teste do Resend (recomendado para testes)
     - Ou configurar um domínio próprio (recomendado para produção)

### 3. Configurar no Sistema

1. Acesse o aplicativo e faça login
2. Vá em **Configurações** (menu lateral)
3. Role até a seção **"Configurações de Email"**
4. Preencha os campos:
   - **Chave API do Resend:** Cole a chave que você copiou
   - **Email Remetente:** `lireleiloesgestoes@gmail.com`
   - **Dias antes do vencimento:** `3` (recomendado)
   - **Dias depois do vencimento:** `1` (recomendado)
   - **Envio Automático:** Deixe desativado no início
5. Clique em **Salvar Configurações**

### 4. Testar o Sistema

1. Na mesma página de **Configurações**, na seção **"Testar Envio de Email"**
2. Digite seu email no campo de teste
3. Clique em **Testar**
4. Aguarde alguns segundos
5. Verifique sua caixa de entrada (e spam)
6. Se receber o email ✅, está tudo configurado!

---

## 📝 Como Usar

### Enviar Cobranças Manualmente

**Na Página de Inadimplência:**

1. Acesse **Inadimplência** no menu lateral
2. No topo da lista, você verá um botão **"Enviar Cobranças"**
3. Clique nele para enviar emails para TODOS os inadimplentes com email cadastrado
4. O sistema mostrará quantos emails foram enviados com sucesso

**Observações:**
- Apenas arrematantes com email cadastrado receberão
- O sistema evita duplicatas (não envia o mesmo email duas vezes no mesmo dia)
- Emails incluem informações do leilão, valor devido, dias de atraso e juros (se configurado)

### Envio Automático (Futuro)

⚠️ **Atenção:** O envio automático ainda não está ativo por padrão.

Para ativar:
1. Vá em **Configurações > Notificações por Email**
2. Ative a opção **"Envio Automático"**
3. O sistema verificará diariamente e enviará:
   - **Lembretes** para pagamentos que vencerão em 3 dias (ou o número configurado)
   - **Cobranças** para pagamentos atrasados há 1 dia ou mais (ou o número configurado)

---

## 📊 Monitoramento

### Histórico de Emails

Na página **Configurações > Notificações por Email**, você pode ver:

- **Histórico de Emails Enviados:** Os últimos 20 emails
- **Status:** ✅ Sucesso ou ❌ Erro
- **Tipo:** 🔔 Lembrete, ⚠️ Cobrança ou ✅ Confirmação
- **Data e Hora do Envio**
- **Destinatário**

---

## 🎨 Templates de Email

Os emails enviados são profissionalmente formatados em HTML com:

- **Logo e cabeçalho** com gradiente personalizado
- **Informações completas** do leilão e arrematante
- **Valores** formatados em reais (R$)
- **Alertas visuais** diferenciados por tipo
- **Design responsivo** (funciona em mobile e desktop)

### Tipos de Email:

1. **🔔 Lembrete de Pagamento**
   - Enviado ANTES do vencimento
   - Tom amigável e informativo
   - Destaca quantos dias faltam

2. **⚠️ Cobrança de Atraso**
   - Enviado APÓS o vencimento
   - Tom mais formal e urgente
   - Mostra dias de atraso e juros calculados
   - Cor vermelha para chamar atenção

3. **✅ Confirmação de Pagamento**
   - Enviado quando pagamento é confirmado
   - Tom de agradecimento
   - Cor verde para celebrar

---

## ⚙️ Configurações Recomendadas

### Para Começar (Teste):
- **Dias antes do vencimento:** 3
- **Dias depois do vencimento:** 1
- **Envio automático:** ❌ Desativado

### Para Produção:
- **Dias antes do vencimento:** 3 a 7 dias
- **Dias depois do vencimento:** 1 dia
- **Envio automático:** ✅ Ativado (após testar bem)

---

## 🔒 Segurança

- ✅ **Chave API** é armazenada localmente no navegador
- ✅ **Emails** são enviados diretamente pelo Resend (serviço seguro)
- ✅ **Logs** são salvos no Supabase para auditoria
- ✅ **Validações** impedem envios duplicados no mesmo dia

---

## 💰 Custos

### Plano Gratuito do Resend:
- ✅ **100 emails por dia**
- ✅ **3.000 emails por mês**
- ✅ Sem cartão de crédito necessário
- ✅ Suficiente para a maioria dos casos

### Quando Atualizar:
- Se você tiver mais de 100 inadimplentes por dia
- Se quiser enviar mais de 3.000 emails por mês
- Planos pagos começam em $20/mês (50.000 emails)

---

## 🐛 Solução de Problemas

### ❌ "Chave API do Resend não configurada"
**Solução:** Vá em Configurações e adicione a chave API do Resend

### ❌ "Este arrematante não possui email cadastrado"
**Solução:** Adicione o email do arrematante na página de Arrematantes ou Leilões

### ❌ "Email já foi enviado hoje para este arrematante"
**Solução:** Isso é normal! O sistema evita spam. Tente novamente amanhã.

### ❌ Email não chega
**Soluções:**
1. Verifique a pasta de **spam/lixo eletrônico**
2. Confirme que o domínio está verificado no Resend
3. Teste com outro email
4. Verifique os logs na página de Configurações

### ❌ "Erro ao enviar email"
**Soluções:**
1. Verifique se a chave API está correta
2. Confirme que tem créditos disponíveis no Resend
3. Verifique sua conexão com a internet
4. Veja os logs no Resend Dashboard para mais detalhes

---

## 📞 Suporte

### Resend:
- **Documentação:** [resend.com/docs](https://resend.com/docs)
- **Dashboard:** [resend.com/dashboard](https://resend.com/dashboard)
- **Status:** [status.resend.com](https://status.resend.com)

### Supabase:
- **Dashboard:** [supabase.com/dashboard](https://supabase.com/dashboard)
- **Documentação:** [supabase.com/docs](https://supabase.com/docs)

---

## ✅ Checklist de Implementação

Use este checklist para garantir que tudo está configurado:

- [ ] Migração do Supabase executada (tabela `email_logs` criada)
- [ ] Conta criada no Resend
- [ ] Chave API do Resend obtida
- [ ] Domínio/email verificado no Resend
- [ ] Chave API configurada no sistema
- [ ] Email remetente configurado
- [ ] Dias de lembrete/cobrança configurados
- [ ] Email de teste enviado e recebido ✅
- [ ] Primeira cobrança real testada
- [ ] Histórico de emails verificado

---

## 🎯 Próximos Passos

Após a configuração inicial:

1. **Teste com usuários reais** (mas poucos)
2. **Monitore os logs** de envio
3. **Ajuste as configurações** conforme necessário
4. **Ative o envio automático** quando estiver confiante
5. **Configure domínio próprio** no Resend para melhor entregabilidade

---

## 📈 Benefícios do Sistema

✅ **Economiza tempo** - Sem necessidade de enviar emails manualmente

✅ **Profissional** - Emails bem formatados passam credibilidade

✅ **Organizado** - Histórico completo de todas as comunicações

✅ **Eficiente** - Reduz inadimplência com lembretes proativos

✅ **Escalável** - Funciona mesmo com centenas de arrematantes

---

**Pronto!** Agora seu sistema está completo com notificações automáticas por email. 🎉

Se tiver dúvidas, consulte este guia ou verifique os logs no sistema.

