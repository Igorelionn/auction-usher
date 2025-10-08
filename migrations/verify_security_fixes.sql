-- =====================================================
-- SCRIPT DE VERIFICAÇÃO DE CORREÇÕES DE SEGURANÇA
-- =====================================================
-- Execute este script após aplicar fix_security_issues.sql
-- para verificar se todas as correções foram aplicadas
-- =====================================================

\echo '=========================================='
\echo 'VERIFICANDO CORREÇÕES DE SEGURANÇA'
\echo '=========================================='
\echo ''

-- =====================================================
-- 1. VERIFICAR VIEWS SEM SECURITY DEFINER
-- =====================================================
\echo '1. Verificando views sem SECURITY DEFINER...'

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN ('dashboard_stats', 'bidders_with_status', 'auctions_complete')
    AND definition LIKE '%SECURITY DEFINER%';
  
  IF v_count = 0 THEN
    RAISE NOTICE '✅ SUCESSO: Todas as 3 views foram corrigidas (sem SECURITY DEFINER)';
  ELSE
    RAISE WARNING '❌ FALHA: % view(s) ainda possui(em) SECURITY DEFINER', v_count;
  END IF;
END $$;

\echo ''

-- =====================================================
-- 2. VERIFICAR RLS HABILITADO NAS TABELAS
-- =====================================================
\echo '2. Verificando RLS habilitado nas tabelas...'

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('user_activity_logs', 'user_actions', 'user_credentials')
    AND rowsecurity = true;
  
  IF v_count = 3 THEN
    RAISE NOTICE '✅ SUCESSO: RLS habilitado em todas as 3 tabelas';
  ELSE
    RAISE WARNING '❌ FALHA: RLS habilitado em apenas % de 3 tabelas', v_count;
  END IF;
END $$;

\echo ''

-- =====================================================
-- 3. VERIFICAR POLÍTICAS RLS CRIADAS
-- =====================================================
\echo '3. Verificando políticas RLS criadas...'

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('user_activity_logs', 'user_actions', 'user_credentials');
  
  IF v_count >= 8 THEN
    RAISE NOTICE '✅ SUCESSO: % políticas RLS criadas', v_count;
  ELSE
    RAISE WARNING '⚠️  ATENÇÃO: Apenas % políticas RLS encontradas (esperado: 8+)', v_count;
  END IF;
END $$;

\echo ''

-- =====================================================
-- 4. VERIFICAR FUNÇÕES COM SEARCH_PATH
-- =====================================================
\echo '4. Verificando funções com search_path definido...'

DO $$
DECLARE
  v_total integer := 7;
  v_fixed integer;
  v_functions text[] := ARRAY[
    'verify_password',
    'create_user_credentials',
    'update_email_logs_updated_at',
    'create_user_password',
    'update_user_password',
    'mark_user_offline',
    'update_updated_at_column'
  ];
  v_func text;
  v_has_search_path boolean;
BEGIN
  v_fixed := 0;
  
  FOREACH v_func IN ARRAY v_functions
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = v_func
        AND proconfig IS NOT NULL
        AND array_to_string(proconfig, ',') LIKE '%search_path%'
    ) INTO v_has_search_path;
    
    IF v_has_search_path THEN
      v_fixed := v_fixed + 1;
    ELSE
      RAISE WARNING '  ⚠️  Função % ainda sem search_path', v_func;
    END IF;
  END LOOP;
  
  IF v_fixed = v_total THEN
    RAISE NOTICE '✅ SUCESSO: Todas as % funções foram corrigidas', v_total;
  ELSE
    RAISE WARNING '❌ FALHA: % de % funções corrigidas', v_fixed, v_total;
  END IF;
END $$;

\echo ''

-- =====================================================
-- 5. RESUMO DETALHADO
-- =====================================================
\echo '=========================================='
\echo 'RESUMO DETALHADO'
\echo '=========================================='
\echo ''

-- Listar views e seu status
\echo 'Views sem SECURITY DEFINER:'
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN '❌ TEM SECURITY DEFINER'
    ELSE '✅ OK'
  END as status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('dashboard_stats', 'bidders_with_status', 'auctions_complete')
ORDER BY viewname;

\echo ''

-- Listar tabelas e status do RLS
\echo 'Tabelas com RLS:'
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS HABILITADO'
    ELSE '❌ RLS DESABILITADO'
  END as status,
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public' AND pg_policies.tablename = pg_tables.tablename
  ) as num_policies
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_activity_logs', 'user_actions', 'user_credentials')
ORDER BY tablename;

\echo ''

-- Listar funções e status do search_path
\echo 'Funções com search_path:'
SELECT 
  p.proname as function_name,
  CASE 
    WHEN proconfig IS NOT NULL AND array_to_string(proconfig, ',') LIKE '%search_path%' 
    THEN '✅ TEM SEARCH_PATH'
    ELSE '❌ SEM SEARCH_PATH'
  END as status,
  COALESCE(
    (SELECT unnest FROM unnest(proconfig) WHERE unnest LIKE 'search_path=%'),
    'Não definido'
  ) as search_path_value
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
  )
ORDER BY p.proname;

\echo ''
\echo '=========================================='
\echo 'VERIFICAÇÃO CONCLUÍDA'
\echo '=========================================='
\echo ''
\echo 'Se todos os itens estiverem com ✅, as correções foram aplicadas com sucesso!'
\echo 'Se houver itens com ❌, execute novamente a migration fix_security_issues.sql'
\echo ''

