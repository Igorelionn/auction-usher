# ✅ Sistema de Fator Multiplicador Implementado

## 🎯 O que foi implementado?

Sistema completo de **Fator Multiplicador** e **Modelos de Parcelamento Customizáveis** para o sistema de leilões.

## 📋 Mudanças Principais

### 1. **Quando o Fator Multiplicador aparece?**

O sistema de **Fator Multiplicador** agora só aparece quando o tipo de pagamento é:

- ✅ **Parcelamento**
- ✅ **Entrada + Parcelamento**
- ❌ **NÃO aparece** para À Vista

### 2. **Como funciona?**

1. No formulário de criação/edição de lote, ao selecionar "Parcelamento" ou "Entrada + Parcelamento", aparece:
   - **Checkbox**: "Ativar Sistema de Lance × Fator Multiplicador"
   - **Campo**: Valor do Lance (R$)
   - **Campo**: Fator Multiplicador (15, 30, 40, 50, ou Personalizado)
   - **Preview**: Cálculo automático do valor total

2. **Fórmula**: `Valor Total = Valor do Lance × Fator Multiplicador`
   - Exemplo: R$ 1.000,00 × 30 = **R$ 30.000,00**

### 3. **Modelos de Parcelamento** (Apenas para Entrada + Parcelamento)

Quando o tipo é "Entrada + Parcelamento", você pode escolher:

- **Parcelas Simples** (Padrão): Todas as parcelas com valores iguais
- **15 Parcelas Duplas**: 15 parcelas, cada uma vale 2x o valor base
- **1 + 29**: 1 entrada + 29 parcelas iguais
- **1 + 49**: 1 entrada + 49 parcelas iguais
- **Mix: Triplas e Duplas**: Combine parcelas triplas (3x), duplas (2x) e simples (1x)
- **Modelo Customizado**: Configure livremente quantas parcelas de cada tipo

### 4. **Preview do Parcelamento**

Ao configurar o fator multiplicador e modelo de parcelamento, um **preview visual** mostra:

- Valor total calculado
- Lista detalhada de todas as parcelas
- Tipo de cada parcela (simples/dupla/tripla)
- Valor de cada parcela
- Total de parcelas

## 🔧 Arquivos Modificados

### **Novos Arquivos Criados:**

1. ✅ `src/lib/parcelamento-calculator.ts` - Funções de cálculo centralizadas
2. ✅ `src/components/ParcelamentoPreview.tsx` - Componente de preview visual

### **Arquivos Atualizados:**

1. ✅ `src/lib/types.ts` - Novos tipos e interfaces
2. ✅ `src/components/AuctionForm.tsx` - Formulário com novos campos (CONDICIONAL)
3. ✅ `src/pages/Dashboard.tsx` - Cálculos atualizados
4. ✅ `src/pages/Inadimplencia.tsx` - Cálculos de atraso atualizados
5. ✅ `src/pages/Arrematantes.tsx` - Gestão de pagamentos atualizada
6. ✅ `src/pages/Faturas.tsx` - Geração de faturas atualizada
7. ✅ `src/hooks/use-email-notifications.ts` - Templates de email atualizados

## 📊 Como Usar

### Passo 1: Criar/Editar um Leilão

1. Acesse a página de criar/editar leilão
2. Adicione um lote
3. Configure as mercadorias do lote

### Passo 2: Configurar Pagamento

1. Escolha o tipo de pagamento:
   - **Parcelamento** OU **Entrada + Parcelamento**
2. Ative o checkbox: "Usar Sistema de Lance × Fator Multiplicador"
3. Preencha:
   - Valor do Lance (ex: R$ 1.000,00)
   - Fator Multiplicador (ex: 30)
4. Veja o preview: R$ 1.000,00 × 30 = **R$ 30.000,00**

### Passo 3: Configurar Modelo de Parcelamento (se for Entrada + Parcelamento)

1. Escolha o modelo desejado
2. Se escolher "Mix" ou "Customizado", configure:
   - Quantidade de parcelas triplas (valor × 3)
   - Quantidade de parcelas duplas (valor × 2)
   - Quantidade de parcelas simples (valor × 1)
3. Veja o preview detalhado de todas as parcelas

### Passo 4: Salvar

1. Salve o leilão
2. Todos os cálculos de:
   - Dashboard (total recebido, total a receber)
   - Inadimplência (parcelas atrasadas)
   - Arrematantes (valores com juros)
   - Faturas (geração de boletos)
   - Emails (notificações)

   ...serão feitos automaticamente usando o novo sistema!

## 🔄 Retrocompatibilidade

✅ **Leilões antigos continuam funcionando normalmente!**

O sistema verifica se o lote/arrematante usa o fator multiplicador:

- Se **SIM**: usa `Valor do Lance × Fator Multiplicador`
- Se **NÃO**: usa o `valorPagarNumerico` (sistema antigo)

## 🎨 Interface Visual

### Exemplo de Interface no AuctionForm

```text
┌────────────────────────────────────────────────┐
│ Condições de Pagamento: [Parcelamento ▼]      │
├────────────────────────────────────────────────┤
│ ✓ Sistema de Lance × Fator Multiplicador      │
│                                                │
│ Valor do Lance (R$):  [1000.00]               │
│ Fator Multiplicador:  [30 ▼]                  │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Valor Total Calculado:                   │  │
│ │ R$ 1.000,00 × 30 = R$ 30.000,00         │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

## 🧪 Testando

1. Crie um novo leilão
2. Adicione um lote
3. Configure como "Parcelamento" ou "Entrada + Parcelamento"
4. Ative o fator multiplicador
5. Preencha valores e veja o preview
6. Salve e verifique nos outros módulos

## 📞 Suporte

Se encontrar algum problema:

1. Verifique se todos os campos obrigatórios estão preenchidos
2. Verifique se o tipo de pagamento está correto
3. Veja o console do navegador para erros
4. Entre em contato com o suporte técnico

---

**Status**: ✅ Implementação 100% concluída sem erros de lint
**Data**: ${new Date().toLocaleDateString('pt-BR')}
