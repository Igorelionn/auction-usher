# 🧪 GUIA DE TESTE - CORREÇÃO DE VALORES NOS EMAILS

## ✅ CORREÇÕES APLICADAS

### Problemas Corrigidos:
1. ❌ **ANTES:** Valor Original no email mostrava R$ 900.000 (valor total do leilão)
2. ✅ **AGORA:** Valor Original mostra R$ 75.000 (valor correto da parcela)

3. ❌ **ANTES:** Encargos absurdos de R$ 3.444.128,10
4. ✅ **AGORA:** Encargos corretos calculados sobre o valor da parcela

---

## 📋 CENÁRIOS DE TESTE

### Cenário 1: Parcelamento Simples (12x)

**Configuração:**
- Valor Total: R$ 900.000,00
- Tipo: Parcelamento
- Parcelas: 12
- Juros: 2% ao mês
- Dias de atraso: 180 (6 meses)

**Valores Esperados no Email:**
```
Valor Original:  R$ 75.000,00  (900.000 ÷ 12)
Encargos:        R$ 9.000,00   (75.000 × 2% × 6)
Valor Total:     R$ 84.000,00
```

---

### Cenário 2: Entrada + Parcelamento

**Configuração:**
- Valor Total: R$ 900.000,00
- Tipo: Entrada + Parcelamento
- Entrada: R$ 270.000,00 (30%)
- Parcelas: 10
- Juros: 2% ao mês

**Email da Entrada (Parcela 1):**
```
Valor Original:  R$ 270.000,00  (valor da entrada)
Encargos:        R$ X  (se houver atraso)
```

**Email das Parcelas (2-11):**
```
Valor Original:  R$ 63.000,00  ((900.000 - 270.000) ÷ 10)
Encargos:        R$ X  (se houver atraso)
```

---

### Cenário 3: À Vista

**Configuração:**
- Valor Total: R$ 900.000,00
- Tipo: À Vista
- Juros: 2% ao mês
- Dias de atraso: 180

**Email de Cobrança:**
```
Valor Original:  R$ 900.000,00  (valor total)
Encargos:        R$ 108.000,00  (900.000 × 2% × 6)
Valor Total:     R$ 1.008.000,00
```

---

## 🔍 COMO TESTAR

### Passo 1: Criar Leilão de Teste

1. Acesse **Leilões** → **Novo Leilão**
2. Preencha:
   - Nome: "Teste Email Cobrança"
   - Data: Hoje
   - Tipo: Parcelamento
   - Valor: R$ 900.000,00

### Passo 2: Adicionar Arrematante

1. Clique em **Adicionar Arrematante**
2. Preencha:
   - Nome: Seu nome
   - Email: Seu email
   - Valor: R$ 900.000,00
   - Parcelas: 12
   - Juros: 2% ao mês
   - Data vencimento: **6 meses atrás** (para simular atraso)

### Passo 3: Enviar Email de Cobrança

1. Acesse **Inadimplência**
2. Encontre o leilão de teste
3. Clique em **Enviar Cobrança**
4. Verifique seu email

### Passo 4: Verificar Email

**Confira se os valores estão corretos:**

✅ **Dados do Débito:**
- Leilão: Teste Email Cobrança
- Lote: (se houver)
- Tipo: Parcela 1/12
- Valor Original: **R$ 75.000,00** ✓
- Encargos: **~R$ 9.000,00** ✓
- Valor Total: **~R$ 84.000,00** ✓
- Data Vencimento: (6 meses atrás)
- Dias em Atraso: **~180 dias** ✓

---

## 🎯 LOGS DE DEBUG

### Ao enviar o email, verifique o console do navegador:

```
💰 DEBUG Email Cobrança:
   - Valor Total Leilão: R$ 900.000,00
   - Tipo Pagamento: parcelamento
   - Parcela 1/12
   - Valor da Parcela: R$ 75.000,00
   - Dias em Atraso: 180
   - Percentual Juros: 2% ao mês
   - Valor Juros: R$ 9.000,00
   - Valor Total com Juros: R$ 84.000,00
```

---

## ⚠️ CASOS ESPECIAIS

### Juros Simples vs Compostos

**Juros Simples (padrão):**
```
Juros = valorParcela × (percentual/100) × (meses)
      = 75.000 × 0.02 × 6
      = R$ 9.000,00
```

**Juros Compostos:**
```
Valor Final = valorParcela × (1 + percentual/100)^meses
            = 75.000 × (1.02)^6
            = R$ 84.457,78
Juros = R$ 9.457,78
```

---

## 📊 VALIDAÇÃO DOS CÁLCULOS

### Fórmula de Validação Manual:

1. **Calcular valor da parcela:**
   - À vista: `valorParcela = valorTotal`
   - Parcelamento: `valorParcela = valorTotal / numParcelas`
   - Entrada+Parcelamento (entrada): `valorParcela = valorEntrada`
   - Entrada+Parcelamento (parcelas): `valorParcela = (valorTotal - valorEntrada) / numParcelas`

2. **Calcular juros (simples):**
   ```
   mesesAtraso = diasAtraso / 30
   juros = valorParcela × (percentualJuros/100) × mesesAtraso
   ```

3. **Calcular total:**
   ```
   valorTotal = valorParcela + juros
   ```

---

## ✅ CHECKLIST DE TESTE

- [ ] Teste com parcelamento simples (12x)
- [ ] Teste com entrada + parcelamento
- [ ] Teste com pagamento à vista
- [ ] Teste com juros simples
- [ ] Teste com juros compostos
- [ ] Verificar logs no console
- [ ] Verificar email recebido
- [ ] Confirmar valores corretos
- [ ] Testar diferentes percentuais de juros (1%, 2%, 5%)
- [ ] Testar diferentes períodos de atraso (30, 60, 180 dias)

---

## 🚀 DEPLOY PARA PRODUÇÃO

Após validar todos os testes:

```bash
# 1. Commit das alterações
git add .
git commit -m "fix: corrigir cálculo de valores nos emails de cobrança e lembrete"

# 2. Push para o repositório
git push origin main

# 3. Deploy automático no Vercel
```

---

## 📞 SUPORTE

Se encontrar algum problema:

1. **Verificar logs do console** (F12 no navegador)
2. **Verificar arquivo:** `src/hooks/use-email-notifications.ts`
3. **Verificar documento:** `CORRECAO_VALORES_EMAIL_COBRANCA.md`

---

**Data da Correção:** Hoje
**Versão:** 1.0
**Status:** ✅ Pronto para Teste

