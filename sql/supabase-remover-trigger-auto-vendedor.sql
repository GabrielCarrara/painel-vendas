-- Remove o auto-cadastro de vendedor ao criar usuário no Auth.
-- Antes: qualquer signUp criava linha em usuarios_custom como vendedor ativo.
-- Depois: perfis só são criados pela Edge Function criar-usuario (service role).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();

-- Impede que usuários autenticados criem o próprio perfil via API/Login.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.usuarios_custom;
