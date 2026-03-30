-- Migração: adicionar Vendedor e Origem nos Processos
-- Rode no SQL Editor do Supabase.

alter table public.processos_clientes
  add column if not exists vendedor_nome text null,
  add column if not exists origem text null;

-- Normaliza valores existentes (opcional)
update public.processos_clientes
set origem = null
where origem is not null and trim(origem) = '';

-- Restrições (opcional, mas recomendado)
alter table public.processos_clientes
  drop constraint if exists processos_clientes_origem_check;

alter table public.processos_clientes
  add constraint processos_clientes_origem_check
  check (origem in ('PONTES_E_LACERDA', 'MIRASSOL', 'EXTERNO') or origem is null);

