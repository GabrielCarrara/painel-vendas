-- =============================================================================
-- RLS: vendas, leads e proteção de perfil (usuarios_custom)
-- Execute no SQL Editor do Supabase.
-- =============================================================================

-- Helpers (SECURITY DEFINER para resolver id vs auth_id legado)
CREATE OR REPLACE FUNCTION public.meu_perfil_row()
RETURNS public.usuarios_custom
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.*
  FROM public.usuarios_custom u
  WHERE (u.id = auth.uid() OR u.auth_id = auth.uid())
    AND coalesce(u.ativo, true) = true
  ORDER BY CASE WHEN u.id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.pode_acessar_venda(venda_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meu_perfil_row() u
    LEFT JOIN public.usuarios_custom vendedor ON vendedor.id = venda_usuario_id
    WHERE
      lower(trim(coalesce(u.cargo, ''))) IN ('diretor', 'admin')
      OR (
        lower(trim(coalesce(u.cargo, ''))) IN ('gerente', 'vendedor')
        AND vendedor.id_filial IS NOT DISTINCT FROM u.id_filial
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_inserir_venda(new_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meu_perfil_row() u
    LEFT JOIN public.usuarios_custom alvo ON alvo.id = new_usuario_id
    WHERE
      lower(trim(coalesce(u.cargo, ''))) IN ('diretor', 'admin')
      OR (
        lower(trim(coalesce(u.cargo, ''))) = 'gerente'
        AND alvo.id_filial IS NOT DISTINCT FROM u.id_filial
      )
      OR (
        lower(trim(coalesce(u.cargo, ''))) = 'vendedor'
        AND new_usuario_id IN (u.id, auth.uid())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_alterar_venda(venda_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meu_perfil_row() u
    WHERE
      (
        lower(trim(coalesce(u.cargo, ''))) IN ('diretor', 'admin', 'gerente')
        AND public.pode_acessar_venda(venda_usuario_id)
      )
      OR (
        lower(trim(coalesce(u.cargo, ''))) = 'vendedor'
        AND venda_usuario_id IN (u.id, auth.uid())
      )
  );
$$;

-- =============================================================================
-- VENDAS
-- =============================================================================
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendedores podem atualizar suas proprias vendas" ON public.vendas;

DROP POLICY IF EXISTS "vendas_select_authenticated" ON public.vendas;
CREATE POLICY "vendas_select_authenticated"
  ON public.vendas FOR SELECT TO authenticated
  USING (public.pode_acessar_venda(usuario_id));

DROP POLICY IF EXISTS "vendas_insert_authenticated" ON public.vendas;
CREATE POLICY "vendas_insert_authenticated"
  ON public.vendas FOR INSERT TO authenticated
  WITH CHECK (public.pode_inserir_venda(usuario_id));

DROP POLICY IF EXISTS "vendas_update_authenticated" ON public.vendas;
CREATE POLICY "vendas_update_authenticated"
  ON public.vendas FOR UPDATE TO authenticated
  USING (public.pode_alterar_venda(usuario_id))
  WITH CHECK (public.pode_alterar_venda(usuario_id));

DROP POLICY IF EXISTS "vendas_delete_authenticated" ON public.vendas;
CREATE POLICY "vendas_delete_authenticated"
  ON public.vendas FOR DELETE TO authenticated
  USING (public.pode_alterar_venda(usuario_id));

-- =============================================================================
-- LEADS (cada usuário só vê/edita os próprios)
-- =============================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select_own" ON public.leads;
CREATE POLICY "leads_select_own"
  ON public.leads FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR usuario_id IN (
      SELECT u.id FROM public.usuarios_custom u
      WHERE u.id = auth.uid() OR u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "leads_insert_own" ON public.leads;
CREATE POLICY "leads_insert_own"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    OR usuario_id IN (
      SELECT u.id FROM public.usuarios_custom u
      WHERE u.id = auth.uid() OR u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "leads_update_own" ON public.leads;
CREATE POLICY "leads_update_own"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    OR usuario_id IN (
      SELECT u.id FROM public.usuarios_custom u
      WHERE u.id = auth.uid() OR u.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    OR usuario_id IN (
      SELECT u.id FROM public.usuarios_custom u
      WHERE u.id = auth.uid() OR u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "leads_delete_own" ON public.leads;
CREATE POLICY "leads_delete_own"
  ON public.leads FOR DELETE TO authenticated
  USING (
    usuario_id = auth.uid()
    OR usuario_id IN (
      SELECT u.id FROM public.usuarios_custom u
      WHERE u.id = auth.uid() OR u.auth_id = auth.uid()
    )
  );

-- =============================================================================
-- USUARIOS_CUSTOM — usuário só altera telefone/foto/slug (não cargo, filial, etc.)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.usuarios_custom_bloquear_campos_sensiveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.cargo IS DISTINCT FROM OLD.cargo
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.id_filial IS DISTINCT FROM OLD.id_filial
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.nome IS DISTINCT FROM OLD.nome
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.auth_id IS DISTINCT FROM OLD.auth_id
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'Alteração não permitida neste campo do perfil';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_custom_campos_sensiveis ON public.usuarios_custom;
CREATE TRIGGER trg_usuarios_custom_campos_sensiveis
  BEFORE UPDATE ON public.usuarios_custom
  FOR EACH ROW
  EXECUTE FUNCTION public.usuarios_custom_bloquear_campos_sensiveis();

DROP POLICY IF EXISTS "Usuarios podem ATUALIZAR seus próprios perfis" ON public.usuarios_custom;
CREATE POLICY "Usuarios podem ATUALIZAR seus próprios perfis"
  ON public.usuarios_custom FOR UPDATE TO authenticated
  USING (auth.uid() = id OR auth.uid() = auth_id)
  WITH CHECK (auth.uid() = id OR auth.uid() = auth_id);
