# 🔧 Migration: Adicionar Coluna de Detalhamento de Custos

## ⚠️ IMPORTANTE - EXECUTAR NO SUPABASE

Para que o detalhamento de custos seja salvo no banco de dados, você precisa executar a migration SQL.

## 📋 Passos para Executar

### 1. Acesse o Supabase
- Vá para: https://supabase.com
- Entre no seu projeto

### 2. Abra o SQL Editor
- No menu lateral, clique em **"SQL Editor"**
- Clique em **"New query"**

### 3. Execute a Migration
Copie e cole o SQL abaixo e clique em **"Run"**:

```sql
-- Adicionar coluna detalhe_custos para armazenar a composição detalhada dos custos
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS detalhe_custos JSONB;

-- Adicionar comentário descritivo
COMMENT ON COLUMN auctions.detalhe_custos IS 'Detalhamento dos itens que compõem os custos totais do leilão (array de objetos com id, descricao, valor e valorNumerico)';
```

### 4. Verifique a Execução
- Deve aparecer: **"Success. No rows returned"**
- Se aparecer algum erro, entre em contato

## ✅ Após a Migration

Depois de executar a migration com sucesso:

1. ✅ O detalhamento de custos será salvo automaticamente
2. ✅ Ao abrir o modal novamente, os itens cadastrados aparecerão
3. ✅ Os dados ficam persistidos no banco de dados

## 🔍 O que foi Alterado no Código

- ✅ `src/hooks/use-supabase-auctions.ts` - Atualizado para salvar e carregar `detalheCustos`
- ✅ `src/components/AuctionForm.tsx` - Já estava configurado corretamente
- ✅ `src/lib/types.ts` - Interface já tinha o campo `detalheCustos`

## 📊 Estrutura dos Dados

Os dados são salvos no formato JSON:

```json
[
  {
    "id": "unique-id-1",
    "descricao": "Transporte",
    "valor": "5.000,00",
    "valorNumerico": 5000
  },
  {
    "id": "unique-id-2",
    "descricao": "Alimentação",
    "valor": "2.500,00",
    "valorNumerico": 2500
  }
]
```

## 🆘 Suporte

Se tiver alguma dúvida ou problema, verifique:
- Se está conectado ao projeto correto no Supabase
- Se tem permissões de administrador
- Se a tabela `auctions` existe no banco

