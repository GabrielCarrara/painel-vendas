-- =============================================================================
-- RLS para public.pagamentos_comissao
-- Execute no SQL Editor do Supabase (Dashboard → SQL).
--
-- Sintoma sem isso: "new row violates row-level security policy for table
-- pagamentos_comissao" ao marcar P2/P3 PAGO ou ao cadastrar venda com P1.
--
-- Regras (espelham quem pode mexer na venda no app):
--   - diretor / admin: qualquer venda
--   - gerente: mesma filial que o VENDEDOR da venda (usuarios_custom do v.usuario_id)
--   - vendedor: só venda em que ele é o vendedor (vendas.usuario_id = auth.uid())
--
-- Nota: não usa vendas.id_filial (muitos projetos só têm usuario_id na venda).
-- =============================================================================

ALTER TABLE public.pagamentos_comissao ENABLE ROW LEVEL SECURITY;

-- Evita erro se rodar o script de novo (Postgres 15+)
DROP POLICY IF EXISTS "pagamentos_comissao_select_authenticated" ON public.pagamentos_comissao;
DROP POLICY IF EXISTS "pagamentos_comissao_insert_authenticated" ON public.pagamentos_comissao;
DROP POLICY IF EXISTS "pagamentos_comissao_delete_authenticated" ON public.pagamentos_comissao;

CREATE POLICY "pagamentos_comissao_select_authenticated"
  ON public.pagamentos_comissao
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vendas v
      JOIN public.usuarios_custom u ON u.id = auth.uid()
      LEFT JOIN public.usuarios_custom vendedor ON vendedor.id = v.usuario_id
      WHERE v.id = pagamentos_comissao.venda_id
        AND (
          lower(trim(u.cargo)) IN ('diretor', 'admin')
          OR (
            lower(trim(u.cargo)) = 'gerente'
            AND vendedor.id_filial IS NOT DISTINCT FROM u.id_filial
          )
          OR (
            lower(trim(u.cargo)) = 'vendedor'
            AND v.usuario_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "pagamentos_comissao_insert_authenticated"
  ON public.pagamentos_comissao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vendas v
      JOIN public.usuarios_custom u ON u.id = auth.uid()
      LEFT JOIN public.usuarios_custom vendedor ON vendedor.id = v.usuario_id
      WHERE v.id = pagamentos_comissao.venda_id
        AND (
          lower(trim(u.cargo)) IN ('diretor', 'admin')
          OR (
            lower(trim(u.cargo)) = 'gerente'
            AND vendedor.id_filial IS NOT DISTINCT FROM u.id_filial
          )
          OR (
            lower(trim(u.cargo)) = 'vendedor'
            AND v.usuario_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "pagamentos_comissao_delete_authenticated"
  ON public.pagamentos_comissao
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vendas v
      JOIN public.usuarios_custom u ON u.id = auth.uid()
      LEFT JOIN public.usuarios_custom vendedor ON vendedor.id = v.usuario_id
      WHERE v.id = pagamentos_comissao.venda_id
        AND (
          lower(trim(u.cargo)) IN ('diretor', 'admin')
          OR (
            lower(trim(u.cargo)) = 'gerente'
            AND vendedor.id_filial IS NOT DISTINCT FROM u.id_filial
          )
          OR (
            lower(trim(u.cargo)) = 'vendedor'
            AND v.usuario_id = auth.uid()
          )
        )
    )
  );
