-- Corrige cadastro de leads:
-- a FK antiga apontava leads.usuario_id -> usuarios_custom.auth_id
-- (falha quando o app grava o id do perfil, ou quando auth_id está nulo).
-- O padrão do app é usuario_id = usuarios_custom.id.

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_usuario_auth_id_fkey;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_usuario_id_fkey
  FOREIGN KEY (usuario_id)
  REFERENCES public.usuarios_custom(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;
