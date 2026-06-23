-- Histórico de execuções da automação Gazin (parcelas pagas por grupo/cota)
-- Aplique no Supabase SQL Editor.

create table if not exists public.gazin_verificacoes (
  id uuid primary key default extensions.uuid_generate_v4(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  grupo text not null,
  cota text not null,
  mes_referencia text not null,
  parcelas_pagas int null,
  resultado_tipo text not null, -- OK | SEM_ACESSO | NAO_CADASTRADO | ERRO
  status text not null,         -- SUCESSO | ERRO (do worker)
  motivo text null,
  executado_em timestamptz not null default now()
);

create index if not exists gazin_verificacoes_venda_id_idx
  on public.gazin_verificacoes (venda_id);

create index if not exists gazin_verificacoes_venda_id_executado_em_idx
  on public.gazin_verificacoes (venda_id, executado_em desc);

create index if not exists gazin_verificacoes_grupo_cota_idx
  on public.gazin_verificacoes (grupo, cota);

-- RLS (opcional): por padrão, siga o mesmo padrão que você usa para `vendas`.
-- Se você já usa políticas por filial/role, crie as policies aqui também.
-- Exemplo (ABERTO) - use somente se seu projeto já estiver preparado para isso:
-- alter table public.gazin_verificacoes enable row level security;
-- create policy "allow authenticated read" on public.gazin_verificacoes
--   for select to authenticated using (true);
-- create policy "allow authenticated insert" on public.gazin_verificacoes
--   for insert to authenticated with check (true);

-- Se sua instância ainda não tiver `uuid-ossp`, habilite antes:
-- create extension if not exists "uuid-ossp" with schema extensions;

