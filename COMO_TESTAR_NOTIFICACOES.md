# 🧪 GUIA DE TESTE - ENVIO DE NOTIFICAÇÕES EM MASSA

## ✅ FUNCIONALIDADE IMPLEMENTADA

Criado um botão na página de **Inadimplência** que permite enviar notificações de débito em aberto para todos os inadimplentes com apenas um clique!

---

## 🚀 COMO TESTAR

### Passo 1: Iniciar o Sistema Local

```bash
npm run dev
```

Aguarde o servidor iniciar e acesse: http://localhost:5173

---

### Passo 2: Criar Leilões de Teste

#### Leilão 1 - Parcelamento (Para teste de sucesso)
1. Ir em **Leilões** → **Novo Leilão**
2. Preencher:
   - Nome: "Teste Notificação 1"
   - Data: Hoje
   - Tipo: Parcelamento
   
3. Adicionar Arrematante:
   - Nome: Seu Nome
   - **Email: seu-email@gmail.com** (importante!)
   - Valor: R$ 10.000,00
   - Parcelas: 10
   - Data vencimento: **30 dias atrás** (para estar em atraso)
   - Juros: 2% ao mês

#### Leilão 2 - Sem Email (Para teste de erro)
1. Criar outro leilão
2. Adicionar arrematante **SEM email**
3. Colocar data vencimento no passado

#### Leilão 3 - Entrada + Parcelamento
1. Criar leilão com entrada
2. Adicionar arrematante com email
3. Colocar data entrada no passado

---

### Passo 3: Acessar Inadimplência

1. Clicar em **"Inadimplência"** no menu
2. Verificar que aparecem os leilões em atraso
3. Verificar que o botão mostra: **"Enviar Notificações (3)"**

---

### Passo 4: Enviar Notificações

#### A) Abrir Console para Logs
- Pressionar **F12** no navegador
- Ir na aba **Console**
- Deixar aberto para ver os logs em tempo real

#### B) Clicar no Botão
- Clicar em **"Enviar Notificações (3)"**
- Modal de confirmação será exibido

#### C) Revisar Modal
Verifique se mostra:
- ⚠️ Ícone de alerta
- Quantidade de inadimplentes
- Lista de detalhes do envio
- Dica sobre console

#### D) Confirmar Envio
- Clicar em **"Confirmar e Enviar"**
- Botão mudará para: "⏳ Enviando..."

---

### Passo 5: Acompanhar Progresso

#### No Console, você verá:

```javascript
✅ Notificação enviada: Seu Nome
💰 DEBUG Email Cobrança:
   - Valor Total Leilão: R$ 10.000,00
   - Tipo Pagamento: parcelamento
   - Parcela 1/10
   - Valor da Parcela: R$ 1.000,00
   - Dias em Atraso: 30
   - Percentual Juros: 2% ao mês
   - Valor Juros: R$ 20,00
   - Valor Total com Juros: R$ 1.020,00

❌ Erro ao enviar: João Silva
   Email não cadastrado

⏭️ Cobrança já foi enviada hoje para Maria Santos, pulando...
```

---

### Passo 6: Verificar Resultado

#### Toast de Sucesso Parcial:
```
⚠️ Envio Parcial
2 enviadas com sucesso, 1 com erro.
Verifique o console para detalhes.
```

---

### Passo 7: Verificar Email Recebido

1. Abrir seu email (o que você cadastrou)
2. Procurar por: **"Notificação de Débito em Aberto"**
3. Verificar se os valores estão corretos:

```
Dados do Débito:
Leilão: Teste Notificação 1
Tipo: Parcela 1/10
Valor Original: R$ 1.000,00 ✓
Encargos: R$ 20,00 ✓
Valor Total: R$ 1.020,00 ✓
Data Vencimento: [data de 30 dias atrás]
Dias em Atraso: 30 dias ✓
```

---

## 🔍 CENÁRIOS DE TESTE

### ✅ Cenário 1: Envio com Sucesso
**Setup:**
- Arrematante com email cadastrado
- Data vencimento no passado
- Primeira tentativa de envio hoje

**Resultado Esperado:**
- ✅ Email enviado
- ✅ Aparece no console: "✅ Notificação enviada"
- ✅ Toast de sucesso
- ✅ Email recebido na caixa de entrada

---

### ⏭️ Cenário 2: Duplicata (Já Enviou Hoje)
**Setup:**
- Enviar notificação uma vez
- Tentar enviar novamente no mesmo dia

**Resultado Esperado:**
- ⏭️ Sistema pula o envio
- ⏭️ Console: "Cobrança já foi enviada hoje, pulando..."
- ⚠️ Toast: "X enviada(s), Y pulada(s)"

---

### ❌ Cenário 3: Email Não Cadastrado
**Setup:**
- Arrematante sem email
- Tentar enviar notificação

**Resultado Esperado:**
- ❌ Sistema detecta falta de email
- ❌ Console: "Email não cadastrado"
- ⚠️ Toast mostra erro
- ❌ Não envia nada

---

### ⚠️ Cenário 4: Envio Misto
**Setup:**
- 3 inadimplentes:
  - 1 com email (sucesso)
  - 1 sem email (erro)
  - 1 já enviou hoje (pulado)

**Resultado Esperado:**
- ⚠️ Toast: "Envio Parcial"
- ✅ 1 sucesso
- ❌ 1 erro
- ⏭️ 1 pulado
- 📊 Detalhes no console

---

## 💡 TESTES AVANÇADOS

### Teste 1: Múltiplos Tipos de Pagamento

**Criar 3 Leilões:**
1. À Vista - R$ 5.000
2. Parcelamento 12x - R$ 12.000
3. Entrada 30% + 10x - R$ 20.000

**Verificar no Email:**
- À vista: Valor = R$ 5.000 (total)
- Parcelamento: Valor = R$ 1.000 (12.000 ÷ 12)
- Entrada: Valor = R$ 6.000 (30% de 20.000)

---

### Teste 2: Diferentes Juros

**Criar leilões com:**
- Juros 1% ao mês
- Juros 2% ao mês
- Juros 5% ao mês
- Sem juros (0%)

**Verificar cálculos corretos no email.**

---

### Teste 3: Diferentes Atrasos

**Criar leilões vencidos há:**
- 15 dias (0,5 mês)
- 30 dias (1 mês)
- 60 dias (2 meses)
- 180 dias (6 meses)

**Verificar valores proporcionais.**

---

## 🐛 POSSÍVEIS PROBLEMAS E SOLUÇÕES

### ❌ Problema: Botão desabilitado
**Solução:** 
- Verificar se há inadimplentes
- Criar leilões com data vencimento no passado

### ❌ Problema: Email não chega
**Solução:**
- Verificar spam/lixeira
- Verificar chave API do Resend
- Verificar logs no console
- Verificar se email está cadastrado corretamente

### ❌ Problema: "Email já enviado hoje"
**Solução:**
- Normal! Sistema previne duplicatas
- Aguardar até amanhã para testar novamente
- Ou criar novo leilão para testar

### ❌ Problema: Valores incorretos no email
**Solução:**
- Verificar correção anterior (deve estar aplicada)
- Ver logs no console para debug
- Verificar tipo de pagamento configurado

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Funcionalidade Básica:
- [ ] Botão aparece na página Inadimplência
- [ ] Contador mostra número correto de inadimplentes
- [ ] Modal de confirmação abre ao clicar
- [ ] Processo de envio funciona
- [ ] Toast de feedback aparece

### Validações:
- [ ] Verifica email cadastrado
- [ ] Previne duplicatas (já enviou hoje)
- [ ] Verifica data de vencimento
- [ ] Valida atraso real
- [ ] Calcula valores corretos da parcela

### Interface:
- [ ] Botão desabilitado quando não há inadimplentes
- [ ] Loading durante envio
- [ ] Logs detalhados no console
- [ ] Toast com resultado correto
- [ ] Modal responsivo

### Email:
- [ ] Email recebido
- [ ] Valores corretos (parcela, não total)
- [ ] Juros calculados corretamente
- [ ] Dias de atraso corretos
- [ ] Informações do leilão corretas
- [ ] Visual profissional

---

## 📊 EXEMPLO DE TESTE COMPLETO

### Configuração:
```
Leilão: Teste Completo
Valor Total: R$ 120.000,00
Tipo: Parcelamento
Parcelas: 12
Juros: 2% ao mês
Vencimento: 90 dias atrás
Email: seu-email@exemplo.com
```

### Cálculos Esperados:
```
Valor da Parcela: R$ 10.000,00 (120.000 ÷ 12)
Meses em Atraso: 3 (90 ÷ 30)
Juros Simples: R$ 600,00 (10.000 × 2% × 3)
Valor Total: R$ 10.600,00
```

### Console Deve Mostrar:
```javascript
💰 DEBUG Email Cobrança:
   - Valor Total Leilão: R$ 120.000,00
   - Tipo Pagamento: parcelamento
   - Parcela 1/12
   - Valor da Parcela: R$ 10.000,00
   - Dias em Atraso: 90
   - Percentual Juros: 2% ao mês
   - Valor Juros: R$ 600,00
   - Valor Total com Juros: R$ 10.600,00
✅ Notificação enviada: [Seu Nome]
```

### Email Deve Conter:
```
Valor Original: R$ 10.000,00 ✓
Encargos: R$ 600,00 ✓
Valor Total: R$ 10.600,00 ✓
Dias em Atraso: 90 dias ✓
```

---

## 🚀 APÓS VALIDAÇÃO

### Se tudo funcionou:
1. ✅ Funcionalidade testada
2. ✅ Valores corretos confirmados
3. ✅ Pronto para usar em produção
4. 🎉 Aproveite a economia de tempo!

### Se algo não funcionou:
1. Revisar console para erros
2. Verificar configurações de email
3. Consultar documentação: `ENVIO_NOTIFICACOES_MASSA.md`
4. Verificar correção anterior: `CORRECAO_VALORES_EMAIL_COBRANCA.md`

---

**Bons Testes! 🎉**

