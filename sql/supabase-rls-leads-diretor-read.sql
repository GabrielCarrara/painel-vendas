-- Diretores podem visualizar leads de qualquer vendedor; edição/exclusão continua só do dono.
DROP POLICY IF EXISTS "leads_select_own" ON public.leads;
CREATE POLICY "leads_select_own"
  ON public.leads FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR usuario_id IN (
      SELECT u.id FROM public.usuarios_custom u
      WHERE u.id = auth.uid() OR u.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.usuarios_custom u
      WHERE (u.id = auth.uid() OR u.auth_id = auth.uid())
        AND lower(trim(coalesce(u.cargo, ''))) IN ('diretor', 'admin')
        AND coalesce(u.ativo, true) = true
    )
  );
