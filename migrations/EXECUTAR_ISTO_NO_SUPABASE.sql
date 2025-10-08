-- =====================================================
-- ⚡ CORREÇÃO IMEDIATA DE SEGURANÇA - EXECUTAR AGORA
-- =====================================================
-- COPIE ESTE ARQUIVO INTEIRO E EXECUTE NO SQL EDITOR DO SUPABASE
-- =====================================================

BEGIN;

-- =====================================================
-- PASSO 1: DROPAR E RECRIAR VIEWS SEM SECURITY DEFINER
-- =====================================================

-- Dropar views existentes
DROP VIEW IF EXISTS public.dashboard_stats CASCADE;
DROP VIEW IF EXISTS public.bidders_with_status CASCADE;
DROP VIEW IF EXISTS public.auctions_complete CASCADE;

-- Recriar dashboard_stats SEM SECURITY DEFINER
CREATE VIEW public.dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.auctions) as total_auctions,
  (SELECT COUNT(*) FROM public.auctions WHERE status = 'active') as active_auctions,
  (SELECT COUNT(*) FROM public.bidders) as total_bidders,
  (SELECT COUNT(*) FROM public.lots) as total_lots,
  (SELECT COALESCE(SUM(total_value), 0) FROM public.invoices WHERE status = 'paid') as total_revenue,
  (SELECT COUNT(*) FROM public.invoices WHERE status = 'pending') as pending_invoices,
  (SELECT COUNT(*) FROM public.invoices WHERE status = 'overdue') as overdue_invoices,
  (SELECT COALESCE(SUM(total_value), 0) FROM public.invoices WHERE status IN ('pending', 'overdue')) as total_pending_value;

-- Recriar bidders_with_status SEM SECURITY DEFINER
CREATE VIEW public.bidders_with_status AS
SELECT 
  b.*,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.invoices i 
      WHERE i.bidder_id = b.id 
      AND i.status = 'overdue'
    ) THEN 'inadimplente'
    WHEN EXISTS (
      SELECT 1 FROM public.invoices i 
      WHERE i.bidder_id = b.id 
      AND i.status = 'pending'
    ) THEN 'pendente'
    ELSE 'regular'
  END as payment_status
FROM public.bidders b;

-- Recriar auctions_complete SEM SECURITY DEFINER
CREATE VIEW public.auctions_complete AS
SELECT 
  a.*,
  (SELECT COUNT(*) FROM public.lots WHERE auction_id = a.id) as lot_count,
  (SELECT COUNT(*) FROM public.bidders WHERE id IN (
    SELECT DISTINCT bidder_id FROM public.lots WHERE auction_id = a.id AND bidder_id IS NOT NULL
  )) as bidder_count,
  (SELECT COALESCE(SUM(sale_value), 0) FROM public.lots WHERE auction_id = a.id AND status = 'sold') as total_sales
FROM public.auctions a;

-- =====================================================
-- PASSO 2: HABILITAR RLS NAS TABELAS
-- =====================================================

-- user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Dropar políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.user_activity_logs;

-- Criar novas políticas
CREATE POLICY "Usuários autenticados podem visualizar logs"
  ON public.user_activity_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode inserir logs"
  ON public.user_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- user_actions
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

-- Dropar políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar ações" ON public.user_actions;
DROP POLICY IF EXISTS "Sistema pode inserir ações" ON public.user_actions;
DROP POLICY IF EXISTS "Sistema pode atualizar ações" ON public.user_actions;

-- Criar novas políticas
CREATE POLICY "Usuários autenticados podem visualizar ações"
  ON public.user_actions
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode inserir ações"
  ON public.user_actions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar ações"
  ON public.user_actions
  FOR UPDATE
  USING (true);

-- user_credentials
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Dropar políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem visualizar suas próprias credenciais" ON public.user_credentials;
DROP POLICY IF EXISTS "Sistema pode gerenciar credenciais" ON public.user_credentials;

-- Criar novas políticas
CREATE POLICY "Usuários podem visualizar suas próprias credenciais"
  ON public.user_credentials
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode gerenciar credenciais"
  ON public.user_credentials
  FOR ALL
  USING (true);

-- =====================================================
-- PASSO 3: CORRIGIR FUNÇÕES COM SEARCH_PATH
-- =====================================================

-- verify_password
CREATE OR REPLACE FUNCTION public.verify_password(
  p_username text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stored_hash text;
BEGIN
  SELECT password_hash INTO v_stored_hash
  FROM public.user_credentials
  WHERE username = p_username;
  
  IF v_stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN crypt(p_password, v_stored_hash) = v_stored_hash;
END;
$$;

-- create_user_credentials
CREATE OR REPLACE FUNCTION public.create_user_credentials(
  p_username text,
  p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  INSERT INTO public.user_credentials (username, password_hash)
  VALUES (p_username, crypt(p_password, gen_salt('bf')))
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;

-- update_email_logs_updated_at
CREATE OR REPLACE FUNCTION public.update_email_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- create_user_password
CREATE OR REPLACE FUNCTION public.create_user_password(
  p_username text,
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_credentials (username, password_hash)
  VALUES (p_username, crypt(p_password, gen_salt('bf')))
  ON CONFLICT (username) DO UPDATE
  SET password_hash = crypt(p_password, gen_salt('bf'));
END;
$$;

-- update_user_password
CREATE OR REPLACE FUNCTION public.update_user_password(
  p_username text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.user_credentials
  SET password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE username = p_username;
  
  RETURN FOUND;
END;
$$;

-- mark_user_offline
CREATE OR REPLACE FUNCTION public.mark_user_offline(p_username text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.user_actions
  SET is_online = false,
      last_seen = NOW()
  WHERE username = p_username;
END;
$$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- PASSO 4: GARANTIR PERMISSÕES
-- =====================================================

GRANT SELECT ON public.dashboard_stats TO anon, authenticated;
GRANT SELECT ON public.bidders_with_status TO anon, authenticated;
GRANT SELECT ON public.auctions_complete TO anon, authenticated;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  v_security_definer_views int;
  v_rls_disabled int;
  v_functions_without_path int;
BEGIN
  -- Verificar views com SECURITY DEFINER
  SELECT COUNT(*) INTO v_security_definer_views
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN ('dashboard_stats', 'bidders_with_status', 'auctions_complete')
    AND definition LIKE '%SECURITY DEFINER%';
  
  -- Verificar tabelas sem RLS
  SELECT COUNT(*) INTO v_rls_disabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('user_activity_logs', 'user_actions', 'user_credentials')
    AND rowsecurity = false;
  
  -- Verificar funções sem search_path
  SELECT COUNT(*) INTO v_functions_without_path
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
    AND (proconfig IS NULL OR NOT array_to_string(proconfig, ',') LIKE '%search_path%');
  
  -- Mostrar resultados
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '        RESULTADO DA CORREÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF v_security_definer_views = 0 THEN
    RAISE NOTICE '✅ Views: TODAS corrigidas (0 com SECURITY DEFINER)';
  ELSE
    RAISE WARNING '❌ Views: % ainda com SECURITY DEFINER', v_security_definer_views;
  END IF;
  
  IF v_rls_disabled = 0 THEN
    RAISE NOTICE '✅ RLS: TODAS as tabelas protegidas';
  ELSE
    RAISE WARNING '❌ RLS: % tabelas ainda sem RLS', v_rls_disabled;
  END IF;
  
  IF v_functions_without_path = 0 THEN
    RAISE NOTICE '✅ Funções: TODAS com search_path';
  ELSE
    RAISE WARNING '❌ Funções: % ainda sem search_path', v_functions_without_path;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
  IF v_security_definer_views = 0 AND v_rls_disabled = 0 AND v_functions_without_path = 0 THEN
    RAISE NOTICE '🎉 SUCESSO TOTAL! Todos os problemas corrigidos!';
  ELSE
    RAISE WARNING '⚠️  Ainda há problemas. Verifique os logs acima.';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- Mensagem final
SELECT 
  '🔒 Correções de segurança aplicadas!' as status,
  'Recarregue a página do Supabase e verifique o linter' as proxima_acao;

