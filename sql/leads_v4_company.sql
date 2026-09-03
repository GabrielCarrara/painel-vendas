-- Leads V4 Company (planilha Google Sheets + kanban do diretor)
-- Qualquer autenticado vê. Diretor/admin altera e sincroniza.

create table if not exists public.leads_v4_config (
  id smallint primary key default 1 check (id = 1),
  spreadsheet_url text,
  last_sync_at timestamptz,
  last_sync_count integer not null default 0,
  last_sync_error text,
  updated_at timestamptz not null default now()
);

insert into public.leads_v4_config (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.leads_v4_company (
  id uuid primary key default gen_random_uuid(),
  sheet_row_key text not null unique,
  nome text not null,
  telefone text,
  email text,
  data_lead timestamptz,
  faixa_etaria text,
  ja_fez_consorcio text,
  procurando_emprestimo text,
  renda_familiar text,
  conjunto text,
  conjunto_tipo text check (conjunto_tipo is null or conjunto_tipo = any (array['IMOVEL'::text, 'AUTOMOVEL'::text, 'OUTRO'::text])),
  status text not null default 'NOVO' check (status = any (array[
    'NOVO'::text,
    'ATENDIMENTO_INICIAL'::text,
    'ATENDIMENTO_VENDEDOR'::text,
    'FECHAMENTO_VENDA'::text,
    'LEAD_FRIO'::text
  ])),
  data_primeiro_contato timestamptz,
  descricao_atendimento_inicial text,
  data_atendimento_vendedor timestamptz,
  observacao_vendedor text,
  data_fechamento timestamptz,
  observacao_fechamento text,
  data_lead_frio timestamptz,
  observacao_frio text,
  sheet_row_index integer,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads_v4_company
  add column if not exists usuario_vinculado_id uuid references public.usuarios_custom(id),
  add column if not exists crm_lead_id uuid references public.leads(id) on delete set null;

create index if not exists leads_v4_company_status_idx on public.leads_v4_company (status);
create index if not exists leads_v4_company_data_lead_idx on public.leads_v4_company (data_lead desc nulls last);
create index if not exists leads_v4_company_sheet_row_idx on public.leads_v4_company (sheet_row_index);

drop trigger if exists trg_leads_v4_company_updated_at on public.leads_v4_company;
create trigger trg_leads_v4_company_updated_at
before update on public.leads_v4_company
for each row execute function public.set_updated_at();

alter table public.leads_v4_company enable row level security;
alter table public.leads_v4_config enable row level security;
