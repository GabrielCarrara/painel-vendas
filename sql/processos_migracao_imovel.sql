-- Migração: adicionar etapa IMÓVEL e suas listas
-- Rode no SQL Editor do Supabase.

-- 1) Liberar novo valor de etapa
alter table public.processos_clientes
  drop constraint if exists processos_clientes_etapa_check;

alter table public.processos_clientes
  add constraint processos_clientes_etapa_check
  check (etapa in ('PASSO_1', 'TRANSFERENCIAS', 'PASSO_2', 'SUBSTITUICAO', 'IMOVEL'));

-- 2) Liberar novas listas (mantém as antigas)
alter table public.processos_clientes
  drop constraint if exists processos_clientes_lista_check;

alter table public.processos_clientes
  add constraint processos_clientes_lista_check
  check (
    lista in (
      -- Listas padrão
      'JUNTANDO_DOCUMENTOS', 'EM_ANALISE', 'PENDENCIA', 'CONCLUIDO',
      -- Listas do IMÓVEL
      'PENDENCIADOS', 'ANALISE_DOCUMENTAL', 'VISTORIA', 'CONTRATO_FIANCA', 'REGISTRO_CARTORIO'
    )
  );

