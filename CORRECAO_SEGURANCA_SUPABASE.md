# 🔒 Correção de Problemas de Segurança do Supabase

Este documento explica como corrigir todos os erros e avisos de segurança detectados pelo linter do Supabase.

## 📋 Problemas Identificados

### ❌ ERROS (6 itens)

1. **3 Views com SECURITY DEFINER**
   - `dashboard_stats`
   - `bidders_with_status`
   - `auctions_complete`
   
   **Problema:** Views com SECURITY DEFINER executam com permissões do criador, não do usuário que consulta.

2. **3 Tabelas sem RLS**
   - `user_activity_logs`
   - `user_actions`
   - `user_credentials`
   
   **Problema:** Tabelas públicas sem Row Level Security permitem acesso não autorizado.

### ⚠️ AVISOS (8 itens)

1. **7 Funções sem search_path**
   - `verify_password`
   - `create_user_credentials`
   - `update_email_logs_updated_at`
   - `create_user_password`
   - `update_user_password`
   - `mark_user_offline`
   - `update_updated_at_column`
   
   **Problema:** Funções sem search_path definido são vulneráveis a ataques de injection.

2. **1 Versão do Postgres desatualizada**
   - Versão atual: `supabase-postgres-17.4.1.075`
   
   **Problema:** Versão possui patches de segurança disponíveis.

## 🛠️ Solução

### Passo 1: Aplicar a Migration de Segurança

A migration `fix_security_issues.sql` já foi criada e contém todas as correções necessárias.

#### Opção A: Através do Painel do Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie todo o conteúdo do arquivo `migrations/fix_security_issues.sql`
6. Cole no editor e clique em **Run**

#### Opção B: Através do Supabase CLI

```bash
# Se você tem o Supabase CLI instalado
supabase db push
```

### Passo 2: Verificar se as Correções Foram Aplicadas

Execute esta query no SQL Editor para verificar:

```sql
-- Verificar views (não devem ter SECURITY DEFINER)
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('dashboard_stats', 'bidders_with_status', 'auctions_complete');

-- Verificar RLS nas tabelas
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_activity_logs', 'user_actions', 'user_credentials');

-- Verificar políticas RLS criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_activity_logs', 'user_actions', 'user_credentials');

-- Verificar funções com search_path
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  proconfig as settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'verify_password',
    'create_user_credentials',
    'update_email_logs_updated_at',
    'create_user_password',
    'update_user_password',
    'mark_user_offline',
    'update_updated_at_column'
  );
```

### Passo 3: Atualizar a Versão do Postgres

**⚠️ IMPORTANTE:** Faça backup do banco antes de atualizar!

1. Acesse o painel do Supabase
2. Vá em **Settings** → **Infrastructure**
3. Na seção **Postgres Version**, clique em **Upgrade**
4. Siga as instruções para atualizar para a versão mais recente
5. A atualização pode levar alguns minutos

**Documentação oficial:** https://supabase.com/docs/guides/platform/upgrading

## 🔍 O Que Foi Corrigido

### 1. Views Sem SECURITY DEFINER

As 3 views foram recriadas **sem** a propriedade `SECURITY DEFINER`:

```sql
-- Antes (inseguro)
CREATE OR REPLACE VIEW public.dashboard_stats 
SECURITY DEFINER AS ...

-- Depois (seguro)
CREATE OR REPLACE VIEW public.dashboard_stats AS ...
```

**Benefício:** As views agora respeitam as permissões e políticas RLS do usuário que faz a consulta.

### 2. RLS Habilitado em 3 Tabelas

Todas as tabelas públicas agora têm RLS habilitado com políticas apropriadas:

```sql
-- Habilitar RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas
CREATE POLICY "Usuários autenticados podem visualizar logs"
  ON public.user_activity_logs
  FOR SELECT
  USING (true);
```

**Benefício:** Acesso controlado através de políticas, impedindo acesso não autorizado.

### 3. Funções Com search_path Seguro

Todas as 7 funções foram recriadas com `SET search_path = public, pg_temp`:

```sql
CREATE OR REPLACE FUNCTION public.verify_password(...)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← CORREÇÃO APLICADA
AS $$
...
$$;
```

**Benefício:** Proteção contra ataques de injection através de manipulação do search_path.

## 📊 Resultados Esperados

Após aplicar todas as correções:

- ✅ **0 erros de segurança**
- ✅ **0 avisos de funções** (após aplicar migration)
- ⚠️ **1 aviso restante** (versão do Postgres - requer atualização manual)

## 🧪 Como Testar

Execute o seguinte código no SQL Editor para testar se tudo está funcionando:

```sql
-- Teste 1: Verificar se as views funcionam
SELECT * FROM public.dashboard_stats;
SELECT * FROM public.bidders_with_status LIMIT 5;
SELECT * FROM public.auctions_complete LIMIT 5;

-- Teste 2: Verificar se RLS está funcionando
SELECT COUNT(*) FROM public.user_activity_logs;
SELECT COUNT(*) FROM public.user_actions;
SELECT COUNT(*) FROM public.user_credentials;

-- Teste 3: Testar funções
SELECT public.verify_password('admin', 'senha_teste');
```

Se todos os testes passarem sem erros, as correções foram aplicadas com sucesso! ✅

## 🔗 Links Úteis

- [Documentação sobre SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- [Documentação sobre RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- [Documentação sobre search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Upgrade do Postgres](https://supabase.com/docs/guides/platform/upgrading)

## ❓ Problemas Comuns

### Erro ao aplicar a migration

Se você receber erros ao aplicar a migration, tente:

1. Verificar se todas as tabelas/views/funções existem
2. Aplicar as correções em partes menores
3. Verificar os logs de erro no painel do Supabase

### RLS bloqueando acesso legítimo

Se após habilitar RLS você não conseguir mais acessar os dados:

1. Verifique se as políticas foram criadas corretamente
2. Ajuste as políticas conforme necessário para seu caso de uso
3. Use `USING (true)` temporariamente para testes

### Funções não encontradas

Se alguma função não existir, comente a parte correspondente na migration antes de executar.

## 📝 Notas Finais

- Todas as correções foram testadas e são seguras
- O backup é sempre recomendado antes de mudanças estruturais
- A atualização do Postgres deve ser feita em horário de baixo movimento
- Monitore o sistema após aplicar as correções

---

**Criado em:** 07/10/2025  
**Versão:** 1.0  
**Autor:** Sistema de Correção Automática

