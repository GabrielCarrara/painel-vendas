-- Exclui definitivamente o usuário de teste TI:
-- 2 perfis duplicados em usuarios_custom + 1 conta no Supabase Auth.
-- Verificado antes da exclusão: não há vendas, leads, contempladas,
-- cotas HS ou pagamentos de comissão vinculados a esses IDs.

BEGIN;

DELETE FROM public.usuarios_custom
WHERE id IN (
  'e5a8dee7-03b9-4659-8662-96c3c225f91d'::uuid,
  '04da1966-4a5a-430e-a093-fe63d560106a'::uuid
)
OR auth_id = '04da1966-4a5a-430e-a093-fe63d560106a'::uuid;

DELETE FROM auth.users
WHERE id = '04da1966-4a5a-430e-a093-fe63d560106a'::uuid;

COMMIT;

-- Deve retornar zero linhas.
SELECT id, auth_id, nome, email, ativo
FROM public.usuarios_custom
WHERE id IN (
  'e5a8dee7-03b9-4659-8662-96c3c225f91d'::uuid,
  '04da1966-4a5a-430e-a093-fe63d560106a'::uuid
)
OR auth_id = '04da1966-4a5a-430e-a093-fe63d560106a'::uuid;
