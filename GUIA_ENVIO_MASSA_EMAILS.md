# 📧 GUIA - ENVIO DE NOTIFICAÇÕES EM MASSA

## ✨ NOVA FUNCIONALIDADE IMPLEMENTADA

Agora você pode enviar notificações de débito em aberto para **todos os inadimplentes de uma vez**, com acompanhamento em tempo real!

---

## 🎯 ONDE ENCONTRAR

**Página:** Inadimplência

**Localização:** Botão laranja no canto superior direito

```
┌─────────────────────────────────────────────────────┐
│  Gestão de Inadimplência                            │
│                                                      │
│  [ 📧 Enviar Notificações em Massa ]  [ Exportar ]  │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 COMO USAR

### Passo 1: Acessar a Página de Inadimplência
1. No menu lateral, clique em **"Inadimplência"**
2. Você verá a lista de todos os arrematantes em atraso

### Passo 2: Verificar Inadimplentes
- O sistema automaticamente detecta quem está em atraso
- Verifica quais possuem email cadastrado
- Mostra o total no topo da página

### Passo 3: Clicar em "Enviar Notificações em Massa"
- O botão laranja no canto superior direito
- Só fica ativo se houver inadimplentes

### Passo 4: Revisar a Lista
Um modal será aberto mostrando:

```
┌─────────────────────────────────────────────────┐
│  📧 Enviar Notificações em Massa                │
├─────────────────────────────────────────────────┤
│                                                  │
│  ⚠️ ATENÇÃO                                     │
│  Você está prestes a enviar emails para 5      │
│  inadimplente(s).                               │
│                                                  │
│  • Emails já enviados hoje serão ignorados      │
│  • Intervalo de 1 segundo entre envios          │
│  • Acompanhe o progresso em tempo real          │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Inadimplentes com Email:                   │ │
│  │                                             │ │
│  │ Nome             Email          Atraso     │ │
│  │ João Silva       joao@...       30 dias    │ │
│  │ Maria Santos     maria@...      15 dias    │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│              [ Cancelar ]  [ Confirmar e Enviar ]│
└─────────────────────────────────────────────────┘
```

### Passo 5: Confirmar e Acompanhar
1. Clique em **"Confirmar e Enviar"**
2. Acompanhe o progresso em tempo real:

```
┌─────────────────────────────────────────────────┐
│  Progresso do Envio                    2 de 5   │
│  ████████████░░░░░░░░░░░░░░░░  40%            │
│                                                  │
│  Resultados:                                     │
│  ✅ João Silva      - Email enviado com sucesso │
│  ✅ Maria Santos    - Email enviado com sucesso │
│  ⏳ Pedro Costa     - Enviando...               │
└─────────────────────────────────────────────────┘
```

### Passo 6: Resultado Final
Ao terminar:
- ✅ Mensagem de sucesso com total enviado
- ❌ Lista de erros (se houver)
- 📊 Resumo completo no modal

---

## 🔒 PROTEÇÕES AUTOMÁTICAS

### 1. **Prevenção de Duplicatas**
- O sistema verifica se já enviou email **hoje** para cada inadimplente
- Emails duplicados são automaticamente **ignorados**
- Mensagem: `"Cobrança já foi enviada hoje para este arrematante"`

### 2. **Validação de Email**
- Só envia para inadimplentes com **email cadastrado**
- Ignora automaticamente quem não tem email
- Mostra aviso se nenhum inadimplente tiver email

### 3. **Intervalo entre Envios**
- **1 segundo** de pausa entre cada envio
- Evita sobrecarga no servidor
- Previne bloqueio por spam

### 4. **Valores Corretos**
- ✅ Calcula valor correto da **parcela individual**
- ✅ Aplica juros sobre o valor da **parcela**, não do total
- ✅ Mostra informações precisas no email

---

## 📊 ACOMPANHAMENTO EM TEMPO REAL

### Barra de Progresso
```
Progresso do Envio                     3 de 5
████████████████████░░░░░░░░░  60%
```

### Status Individual
| Nome | Status | Mensagem |
|------|--------|----------|
| João Silva | ✅ | Email enviado com sucesso |
| Maria Santos | ✅ | Cobrança já foi enviada hoje |
| Pedro Costa | ❌ | Erro ao enviar email |

### Contadores
- **Enviados:** Quantos emails foram enviados com sucesso
- **Total:** Total de inadimplentes com email
- **Erros:** Quantos falharam

---

## 📧 CONTEÚDO DO EMAIL

Cada inadimplente recebe um email **personalizado** com:

```
📧 Assunto: Notificação de Débito em Aberto - [Nome do Leilão]

Prezado(a) [Nome],

Identificamos que o pagamento referente ao compromisso abaixo 
encontra-se em atraso.

Dados do Débito:
───────────────────────────────────────
Leilão:          [Nome do Leilão]
Lote:            [Número do Lote]
Tipo:            Parcela 1/12
Valor Original:  R$ 75.000,00  ✅ (valor correto da parcela)
Encargos:        R$ 9.000,00   ✅ (juros sobre a parcela)
Valor Total:     R$ 84.000,00  ✅
Data Vencimento: 15 de abril de 2025
Dias em Atraso:  180 dias
───────────────────────────────────────

Solicitamos atenção imediata para regularização.
```

---

## ⚙️ CONFIGURAÇÕES E LIMITES

### Limites de Envio
- **Intervalo:** 1 segundo entre cada email
- **Timeout:** Sem limite (processo completo)
- **Retry:** Não há retry automático em caso de erro

### Logs no Console
O sistema gera logs detalhados:
```
📧 Enviando email para: João Silva (joao@email.com)
💰 DEBUG Email Cobrança:
   - Valor Total Leilão: R$ 900.000,00
   - Tipo Pagamento: parcelamento
   - Parcela 1/12
   - Valor da Parcela: R$ 75.000,00
   - Dias em Atraso: 180
   - Valor Juros: R$ 9.000,00
✅ Email enviado com sucesso
```

---

## ❌ RESOLUÇÃO DE PROBLEMAS

### Botão Desabilitado
**Causa:** Não há inadimplentes ou todos já receberam email hoje
**Solução:** Aguarde até amanhã ou adicione novos inadimplentes

### "Nenhum Email Cadastrado"
**Causa:** Inadimplentes não possuem email
**Solução:** Cadastre emails na página de Arrematantes

### Email Não Chegou
**Possíveis Causas:**
1. Email está na caixa de spam
2. Email foi bloqueado pelo servidor
3. Erro de digitação no email cadastrado

**Verificações:**
- Cheque a caixa de spam
- Verifique o email cadastrado
- Veja os logs no console (F12)

### Erro ao Enviar
**Causa:** Problema com servidor de email ou configuração
**Solução:**
1. Verifique a chave API do Resend
2. Confira se o domínio está verificado
3. Tente enviar individualmente

---

## 🧪 TESTE RECOMENDADO

### Teste Inicial (Recomendado)
1. **Criar leilão de teste:**
   - Nome: "Teste Email Massa"
   - Adicionar 2-3 arrematantes com **seu email**
   - Configurar atraso (data vencimento no passado)

2. **Testar envio:**
   - Acessar Inadimplência
   - Clicar em "Enviar Notificações em Massa"
   - Verificar se recebe os emails

3. **Validar:**
   - ✅ Valores corretos da parcela
   - ✅ Juros calculados corretamente
   - ✅ Informações personalizadas

---

## 📋 CHECKLIST DE USO

Antes de enviar em massa:

- [ ] Verificar se todos os emails estão corretos
- [ ] Confirmar valores de juros configurados
- [ ] Revisar lista de inadimplentes no modal
- [ ] Testar com 1-2 envios individuais primeiro
- [ ] Acompanhar progresso até o fim
- [ ] Verificar resultados e erros
- [ ] Consultar logs se houver problemas

---

## 🎯 BENEFÍCIOS

### Economia de Tempo
- ⏱️ **Antes:** Enviar email individual para cada inadimplente
- ⚡ **Agora:** Um clique envia para todos

### Controle e Visibilidade
- 📊 Acompanhamento em tempo real
- ✅ Confirmação de sucesso/erro individual
- 📝 Logs detalhados para auditoria

### Segurança
- 🔒 Prevenção automática de duplicatas
- ✅ Validação de emails
- ⏳ Controle de taxa de envio

---

## 📞 SUPORTE

### Em Caso de Dúvidas

1. **Verifique os logs:** Abra o console (F12) e procure por erros
2. **Consulte a documentação:** 
   - `CORRECAO_VALORES_EMAIL_COBRANCA.md` (valores)
   - `TESTE_CORRECAO_EMAILS.md` (testes)
3. **Entre em contato:** Se o problema persistir

---

**Data de Implementação:** Hoje  
**Versão:** 1.0  
**Status:** ✅ Pronto para Uso  
**Localização:** Página de Inadimplência → Botão "Enviar Notificações em Massa"

