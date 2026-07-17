-- =============================================================================
-- Reforço de segurança (RLS) — SEM alterar permissões por cargo/rank
-- =============================================================================
-- O que este script FAZ:
--   1) Liga RLS em tabelas que estavam abertas para a chave anon
--   2) Mantém leitura pública de filiais e galeria (site)
--   3) Em tabelas internas, bloqueia anon e mantém acesso igual para autenticados
--
-- O que este script NÃO FAZ:
--   - Não mexe em policies de vendas, leads, usuarios_custom, contempladas,
--     hs_cotas, configuracoes_mensais, pagamentos, processos, etc.
--   - Não altera cargo, RLS por filial, Edge Functions nem triggers de perfil
--   - Não muda o que diretor / gerente / vendedor já conseguem fazer no painel
--
-- Rode no Supabase → SQL Editor (como owner do projeto).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) filiais / galeria
--    Já existem policies de SELECT público; só faltava LIGAR o RLS.
--    App só faz SELECT nessas tabelas.
-- -----------------------------------------------------------------------------
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria ENABLE ROW LEVEL SECURITY;

-- Garante as policies de leitura (idempotente)
DROP POLICY IF EXISTS "Permitir leitura publica de filiais" ON public.filiais;
CREATE POLICY "Permitir leitura publica de filiais"
  ON public.filiais
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Permitir leitura publica da galeria" ON public.galeria;
CREATE POLICY "Permitir leitura publica da galeria"
  ON public.galeria
  FOR SELECT
  TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 2) Tabelas internas sem RLS (hoje anon tem arwdDxtm completo)
--    Fecha o buraco público; usuários logados continuam com o mesmo acesso
--    amplo de antes (não restringe por cargo — isso já é controlado no app).
--    service_role (Edge Functions / workers) continua bypassando RLS.
-- -----------------------------------------------------------------------------

-- historico_vendas
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historico_vendas_authenticated_all" ON public.historico_vendas;
CREATE POLICY "historico_vendas_authenticated_all"
  ON public.historico_vendas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- estornos_comissao
ALTER TABLE public.estornos_comissao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estornos_comissao_authenticated_all" ON public.estornos_comissao;
CREATE POLICY "estornos_comissao_authenticated_all"
  ON public.estornos_comissao
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- gazin_verificacoes
ALTER TABLE public.gazin_verificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gazin_verificacoes_authenticated_all" ON public.gazin_verificacoes;
CREATE POLICY "gazin_verificacoes_authenticated_all"
  ON public.gazin_verificacoes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3) Confirmação rápida (opcional — só leitura)
-- -----------------------------------------------------------------------------
-- SELECT relname, relrowsecurity
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND relname IN (
--     'filiais','galeria','historico_vendas','estornos_comissao','gazin_verificacoes'
--   );
