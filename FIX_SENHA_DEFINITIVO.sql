-- ===================================
-- SCRIPT DEFINITIVO: Recriar Senha do Usuário
-- ===================================
-- Execute este script NO SUPABASE SQL Editor
-- URL: https://supabase.com/dashboard/project/moojuqphvhrhasxhaahd/sql/new
-- ===================================

-- 1. Verificar extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Verificar se usuário existe
DO $$
DECLARE
  v_user_id uuid;
  v_user_email text;
BEGIN
  SELECT id, email INTO v_user_id, v_user_email
  FROM public.users
  WHERE email = 'igor.elion@arthurlira.com'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ ERRO: Usuário não encontrado!';
  ELSE
    RAISE NOTICE '✅ Usuário encontrado: % (ID: %)', v_user_email, v_user_id;
  END IF;
END $$;

-- 3. DELETAR credencial antiga (se existir)
DELETE FROM public.user_credentials
WHERE user_id = (
  SELECT id FROM public.users 
  WHERE email = 'igor.elion@arthurlira.com'
);

-- 4. CRIAR nova credencial com a senha correta
INSERT INTO public.user_credentials (user_id, password_hash, created_at, updated_at)
SELECT 
  id as user_id,
  crypt('@Elionigorrr2010', gen_salt('bf')) as password_hash,
  NOW() as created_at,
  NOW() as updated_at
FROM public.users
WHERE email = 'igor.elion@arthurlira.com';

-- 5. Verificar se a credencial foi criada
DO $$
DECLARE
  v_hash_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_credentials uc
    JOIN public.users u ON u.id = uc.user_id
    WHERE u.email = 'igor.elion@arthurlira.com'
  ) INTO v_hash_exists;
  
  IF v_hash_exists THEN
    RAISE NOTICE '✅ Credencial criada com sucesso!';
  ELSE
    RAISE NOTICE '❌ ERRO: Credencial não foi criada!';
  END IF;
END $$;

-- 6. TESTAR a senha
DO $$
DECLARE
  v_password_ok boolean;
BEGIN
  SELECT (
    password_hash = crypt('@Elionigorrr2010', password_hash)
  ) INTO v_password_ok
  FROM public.user_credentials uc
  JOIN public.users u ON u.id = uc.user_id
  WHERE u.email = 'igor.elion@arthurlira.com';
  
  IF v_password_ok THEN
    RAISE NOTICE '✅ SENHA CORRETA! Login vai funcionar!';
  ELSE
    RAISE NOTICE '❌ ERRO: Senha não confere!';
  END IF;
END $$;

-- 7. Verificar função verify_password
DO $$
DECLARE
  v_verify_result boolean;
BEGIN
  SELECT public.verify_password('igor.elion@arthurlira.com', '@Elionigorrr2010')
  INTO v_verify_result;
  
  IF v_verify_result THEN
    RAISE NOTICE '✅ Função verify_password retorna TRUE!';
  ELSE
    RAISE NOTICE '❌ ERRO: Função verify_password retorna FALSE!';
  END IF;
END $$;

-- 8. Garantir que usuário está ativo
UPDATE public.users
SET is_active = true
WHERE email = 'igor.elion@arthurlira.com';

-- 9. RESULTADO FINAL
SELECT 
  '✅ TUDO PRONTO!' as status,
  u.email,
  u.name,
  u.role,
  u.is_active,
  CASE 
    WHEN uc.password_hash IS NOT NULL THEN '✅ Senha existe'
    ELSE '❌ Sem senha'
  END as status_senha,
  CASE 
    WHEN uc.password_hash = crypt('@Elionigorrr2010', uc.password_hash) THEN '✅ Senha correta'
    ELSE '❌ Senha incorreta'
  END as teste_senha
FROM public.users u
LEFT JOIN public.user_credentials uc ON u.id = uc.user_id
WHERE u.email = 'igor.elion@arthurlira.com';

