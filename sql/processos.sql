-- Kanban de Processos (clientes)
-- Requisitos:
-- - Qualquer usuário autenticado pode visualizar.
-- - Somente Diretores podem inserir/atualizar/excluir.

-- 1) Tabela
create table if not exists public.processos_clientes (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid null default auth.uid(),

  nome_completo text not null,
  grupo text not null,
  cota text not null,
  telefone text not null,
  administradora text not null check (administradora in ('HS', 'GAZIN')),

  etapa text not null check (etapa in ('PASSO_1', 'TRANSFERENCIAS', 'PASSO_2', 'SUBSTITUICAO')),
  lista text not null check (lista in ('JUNTANDO_DOCUMENTOS', 'EM_ANALISE', 'PENDENCIA', 'CONCLUIDO')),

  data_envio date null,
  data_ultima_analise timestamptz null,
  descricao text null,

  pos_venda boolean not null default false,
  adesao boolean not null default false
);

-- 2) updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_processos_clientes_updated_at on public.processos_clientes;
create trigger trg_processos_clientes_updated_at
before update on public.processos_clientes
for each row execute function public.set_updated_at();

-- 3) Helper para checar Diretor (via usuarios_custom.cargo)
create or replace function public.is_diretor()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.usuarios_custom u
    where u.id = auth.uid()
      and lower(coalesce(u.cargo, '')) in ('diretor', 'sócio-diretor', 'socio-diretor')
  );
$$;

-- 4) RLS
alter table public.processos_clientes enable row level security;

drop policy if exists "processos_select_autenticado" on public.processos_clientes;
create policy "processos_select_autenticado"
on public.processos_clientes
for select
to authenticated
using (true);

drop policy if exists "processos_insert_diretor" on public.processos_clientes;
create policy "processos_insert_diretor"
on public.processos_clientes
for insert
to authenticated
with check (public.is_diretor());

drop policy if exists "processos_update_diretor" on public.processos_clientes;
create policy "processos_update_diretor"
on public.processos_clientes
for update
to authenticated
using (public.is_diretor())
with check (public.is_diretor());

drop policy if exists "processos_delete_diretor" on public.processos_clientes;
create policy "processos_delete_diretor"
on public.processos_clientes
for delete
to authenticated
using (public.is_diretor());

