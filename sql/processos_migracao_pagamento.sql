-- Migração: adicionar campo PAGAMENTO nos Processos
-- Rode no SQL Editor do Supabase.

alter table public.processos_clientes
  add column if not exists pagamento boolean not null default false;

