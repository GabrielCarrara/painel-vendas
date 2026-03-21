-- Opcional: executar no SQL Editor do Supabase APÓS decidir qual linha manter por e-mail.
-- Unifica e-mail em minúsculas e ajuda a localizar duplicatas (mesmo e-mail com caixa diferente).

-- 1) Listar possíveis duplicatas (mesmo e-mail ignorando maiúsculas)
-- SELECT lower(trim(email)) AS em, count(*) AS qtd, array_agg(id) AS ids
-- FROM public.usuarios_custom
-- GROUP BY lower(trim(email))
-- HAVING count(*) > 1;

-- 2) Normalizar todos os e-mails para minúsculas (ajusta TI@gmail.com -> ti@gmail.com)
-- UPDATE public.usuarios_custom SET email = lower(trim(email)) WHERE email IS NOT NULL;

-- 3) Se ainda houver duplicata (dois auth.users para o mesmo e-mail), é preciso
--    remover manualmente o usuário extra em Authentication > Users no painel Supabase
--    e a linha órfã em usuarios_custom, mantendo apenas o registro correto.
