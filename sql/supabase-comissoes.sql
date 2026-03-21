-- Execute no SQL Editor do Supabase (uma vez).
-- Guarda em qual mês (YYYY-MM) o diretor conferiu cada parcela (útil para estorno no mês correto).

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS mes_conferencia_parcela_1 varchar(7);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS mes_conferencia_parcela_2 varchar(7);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS mes_conferencia_parcela_3 varchar(7);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS mes_conferencia_parcela_4 varchar(7);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS mes_conferencia_parcela_5 varchar(7);

-- Opcional: alinhar P1 já lançada para o mês de pagamento = mês seguinte ao da venda
-- UPDATE pagamentos_comissao p
-- SET mes_pagamento = to_char((v.mes || '-01')::date + interval '1 month', 'YYYY-MM')
-- FROM vendas v
-- WHERE p.venda_id = v.id AND p.parcela_index = 1;
