-- Migração: arquivar processos (2º PASSO -> CONCLUÍDO)
-- Rode no SQL Editor do Supabase.

alter table public.processos_clientes
  add column if not exists arquivado boolean not null default false,
  add column if not exists arquivado_em timestamptz null;

