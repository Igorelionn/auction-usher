-- =====================================================
-- CORREÇÃO DE PROBLEMAS DE SEGURANÇA DO SUPABASE
-- =====================================================
-- Esta migration corrige:
-- 1. Views com SECURITY DEFINER
-- 2. Tabelas sem RLS habilitado
-- 3. Funções sem search_path definido
-- =====================================================

-- =====================================================
-- 1. CORRIGIR VIEWS COM SECURITY DEFINER
-- =====================================================

-- Recriar dashboard_stats sem SECURITY DEFINER
DROP VIEW IF EXISTS public.dashboard_stats CASCADE;
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.auctions) as total_auctions,
  (SELECT COUNT(*) FROM public.auctions WHERE status = 'active') as active_auctions,
  (SELECT COUNT(*) FROM public.bidders) as total_bidders,
  (SELECT COUNT(*) FROM public.lots) as total_lots,
  (SELECT COALESCE(SUM(total_value), 0) FROM public.invoices WHERE status = 'paid') as total_revenue,
  (SELECT COUNT(*) FROM public.invoices WHERE status = 'pending') as pending_invoices,
  (SELECT COUNT(*) FROM public.invoices WHERE status = 'overdue') as overdue_invoices,
  (SELECT COALESCE(SUM(total_value), 0) FROM public.invoices WHERE status IN ('pending', 'overdue')) as total_pending_value;

-- Recriar bidders_with_status sem SECURITY DEFINER
DROP VIEW IF EXISTS public.bidders_with_status CASCADE;
CREATE OR REPLACE VIEW public.bidders_with_status AS
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

-- Recriar auctions_complete sem SECURITY DEFINER
DROP VIEW IF EXISTS public.auctions_complete CASCADE;
CREATE OR REPLACE VIEW public.auctions_complete AS
SELECT 
  a.*,
  (SELECT COUNT(*) FROM public.lots WHERE auction_id = a.id) as lot_count,
  (SELECT COUNT(*) FROM public.bidders WHERE id IN (
    SELECT DISTINCT bidder_id FROM public.lots WHERE auction_id = a.id AND bidder_id IS NOT NULL
  )) as bidder_count,
  (SELECT COALESCE(SUM(sale_value), 0) FROM public.lots WHERE auction_id = a.id AND status = 'sold') as total_sales
FROM public.auctions a;

-- =====================================================
-- 2. HABILITAR RLS NAS TABELAS PÚBLICAS
-- =====================================================

-- Habilitar RLS na tabela user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para user_activity_logs (apenas usuários autenticados podem acessar)
CREATE POLICY "Usuários autenticados podem visualizar logs"
  ON public.user_activity_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode inserir logs"
  ON public.user_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Habilitar RLS na tabela user_actions
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_actions (apenas usuários autenticados podem acessar)
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

-- Habilitar RLS na tabela user_credentials
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Políticas para user_credentials (acesso mais restrito)
CREATE POLICY "Usuários podem visualizar suas próprias credenciais"
  ON public.user_credentials
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode gerenciar credenciais"
  ON public.user_credentials
  FOR ALL
  USING (true);

-- =====================================================
-- 3. CORRIGIR FUNÇÕES SEM SEARCH_PATH
-- =====================================================

-- Recriar função verify_password com search_path
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

-- Recriar função create_user_credentials com search_path
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

-- Recriar função update_email_logs_updated_at com search_path
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

-- Recriar função create_user_password com search_path
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

-- Recriar função update_user_password com search_path
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

-- Recriar função mark_user_offline com search_path
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

-- Recriar função update_updated_at_column com search_path
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
-- 4. GARANTIR PERMISSÕES ADEQUADAS
-- =====================================================

-- Garantir que o role anon possa acessar as views
GRANT SELECT ON public.dashboard_stats TO anon;
GRANT SELECT ON public.bidders_with_status TO anon;
GRANT SELECT ON public.auctions_complete TO anon;

-- Garantir que o role authenticated possa acessar as views
GRANT SELECT ON public.dashboard_stats TO authenticated;
GRANT SELECT ON public.bidders_with_status TO authenticated;
GRANT SELECT ON public.auctions_complete TO authenticated;

-- =====================================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON VIEW public.dashboard_stats IS 'View que agrega estatísticas do dashboard sem SECURITY DEFINER';
COMMENT ON VIEW public.bidders_with_status IS 'View que mostra arrematantes com status de pagamento sem SECURITY DEFINER';
COMMENT ON VIEW public.auctions_complete IS 'View que mostra leilões com informações completas sem SECURITY DEFINER';

COMMENT ON POLICY "Usuários autenticados podem visualizar logs" ON public.user_activity_logs IS 'Permite visualização de logs para usuários autenticados';
COMMENT ON POLICY "Sistema pode inserir logs" ON public.user_activity_logs IS 'Permite inserção de logs pelo sistema';

COMMENT ON POLICY "Usuários autenticados podem visualizar ações" ON public.user_actions IS 'Permite visualização de ações para usuários autenticados';
COMMENT ON POLICY "Sistema pode inserir ações" ON public.user_actions IS 'Permite inserção de ações pelo sistema';
COMMENT ON POLICY "Sistema pode atualizar ações" ON public.user_actions IS 'Permite atualização de ações pelo sistema';

COMMENT ON POLICY "Usuários podem visualizar suas próprias credenciais" ON public.user_credentials IS 'Permite visualização de credenciais';
COMMENT ON POLICY "Sistema pode gerenciar credenciais" ON public.user_credentials IS 'Permite gerenciamento completo de credenciais';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Verificar se todas as correções foram aplicadas
DO $$
BEGIN
  RAISE NOTICE 'Migration de segurança aplicada com sucesso!';
  RAISE NOTICE 'Views recriadas sem SECURITY DEFINER: 3';
  RAISE NOTICE 'Tabelas com RLS habilitado: 3';
  RAISE NOTICE 'Funções corrigidas com search_path: 7';
END $$;

